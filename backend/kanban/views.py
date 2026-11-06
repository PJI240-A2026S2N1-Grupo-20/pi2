from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.core.exceptions import ValidationError
from django.http import HttpResponse
from django.utils import timezone
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes

from .models import (
    Contato, Fluxo, Tarefa, Subtarefa, Transicao, Anexo, Auditoria, validar_pdf,
)
from .metrics import (
    calcular_metricas,
    exportar_tarefas_csv,
    exportar_transicoes_csv,
)
from .serializers import (
    ContatoSerializer,
    FluxoSerializer,
    TarefaSerializer,
    SubtarefaSerializer,
    AnexoSerializer,
)
from accounts.permissions import IsAdministrador


TRANSICOES_PERMITIDAS = {
    'pendencias': {'a_fazer'},
    'a_fazer': {'pendencias', 'em_andamento', 'concluido'},
    'em_andamento': {'pendencias', 'a_fazer', 'concluido'},
    'concluido': {'a_fazer', 'em_andamento'},
}


PARAMETROS_PERIODO = [
    OpenApiParameter(
        name='data_inicio',
        type=OpenApiTypes.DATE,
        location=OpenApiParameter.QUERY,
        description='Data inicial no formato AAAA-MM-DD.',
        required=False,
    ),
    OpenApiParameter(
        name='data_fim',
        type=OpenApiTypes.DATE,
        location=OpenApiParameter.QUERY,
        description='Data final no formato AAAA-MM-DD.',
        required=False,
    ),
]


def _apenas_digitos(valor):
    return ''.join(c for c in (valor or '') if c.isdigit())


def _encontrar_contato_duplicado(nome, email, telefone, excluir_pk=None):
    """Retorna (contato_conflitante, motivo) ou (None, None).

    Regra: nome (sem diferenciar caixa), e-mail (sem diferenciar caixa) ou
    telefone (comparando apenas os dígitos) idênticos a um contato ativo
    existente configuram duplicata.
    """
    qs = Contato.objects.filter(ativo=True)
    if excluir_pk is not None:
        qs = qs.exclude(pk=excluir_pk)

    if nome:
        conflito = qs.filter(nome__iexact=nome).first()
        if conflito:
            return conflito, 'nome'

    if email:
        conflito = qs.filter(email__iexact=email).first()
        if conflito:
            return conflito, 'email'

    if telefone:
        digitos = _apenas_digitos(telefone)
        if digitos:
            for candidato in qs.only('telefone'):
                if _apenas_digitos(candidato.telefone) == digitos:
                    return candidato, 'telefone'

    return None, None


def _serializar_campos_auditaveis(tarefa):
    """RF-28: extrai um snapshot JSON-serializável dos campos auditáveis."""
    return {
        'estado': tarefa.estado or '',
        'responsavel': tarefa.responsavel_id,
        'data_prevista': (
            tarefa.data_prevista.isoformat() if tarefa.data_prevista else None
        ),
        'fluxo': tarefa.fluxo_id,
        'contato': tarefa.contato_id,
        'observacoes': tarefa.observacoes or '',
    }


def _registrar_auditoria(tarefa, usuario, tipo, anteriores, novos, justificativa=''):
    """RF-28: registra uma entrada de auditoria apenas quando há diferença."""
    if anteriores == novos:
        return None
    return Auditoria.objects.create(
        tarefa=tarefa,
        usuario=(
            usuario
            if usuario and getattr(usuario, 'is_authenticated', False)
            else None
        ),
        tipo_modificacao=tipo,
        entidade='tarefa',
        entidade_id=tarefa.id,
        dados_anteriores=anteriores or {},
        dados_novos=novos or {},
        justificativa=(justificativa or '').strip(),
    )


class ContatoViewSet(viewsets.ModelViewSet):
    queryset = Contato.objects.filter(ativo=True).order_by('nome')
    serializer_class = ContatoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def _resposta_duplicado(self, contato, motivo):
        rotulo = {
            'nome': 'nome',
            'email': 'e-mail',
            'telefone': 'telefone',
        }.get(motivo, motivo)
        return Response({
            'detail': (
                f"Já existe um contato ativo com este {rotulo}. "
                f"Use o contato existente ou informe um valor diferente."
            ),
            'reason': motivo,
            'existing': ContatoSerializer(contato).data,
        }, status=status.HTTP_400_BAD_REQUEST)

    def create(self, request, *args, **kwargs):
        nome = (request.data.get('nome') or '').strip()
        email = (request.data.get('email') or '').strip()
        telefone = (request.data.get('telefone') or '').strip()

        conflito, motivo = _encontrar_contato_duplicado(nome, email, telefone)
        if conflito:
            return self._resposta_duplicado(conflito, motivo)

        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        nome = (request.data.get('nome', instance.nome) or '').strip()
        email = (request.data.get('email', instance.email) or '').strip()
        telefone = (request.data.get('telefone', instance.telefone) or '').strip()

        conflito, motivo = _encontrar_contato_duplicado(
            nome, email, telefone, excluir_pk=instance.pk,
        )
        if conflito:
            return self._resposta_duplicado(conflito, motivo)

        return super().update(request, *args, **kwargs)


class FluxoViewSet(viewsets.ModelViewSet):
    queryset = Fluxo.objects.filter(ativo=True).order_by('nome')
    serializer_class = FluxoSerializer

    def get_permissions(self):
        if self.request.method in ['POST', 'PUT', 'PATCH', 'DELETE']:
            return [IsAdministrador()]
        return [permissions.IsAuthenticated()]


def _verificar_orcamento_duplicado(numero, excluir_pk=None):
    """RF-26: devolve a tarefa ativa com o mesmo número_orcamento, se houver."""
    if not numero:
        return None
    qs = Tarefa.objects.filter(deletado=False, numero_orcamento__iexact=numero)
    if excluir_pk is not None:
        qs = qs.exclude(pk=excluir_pk)
    return qs.first()


class TarefaViewSet(viewsets.ModelViewSet):
    serializer_class = TarefaSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            Tarefa.objects
            .filter(deletado=False)
            .select_related('fluxo', 'contato', 'responsavel', 'criado_por')
            .prefetch_related('subtarefas', 'transicoes', 'auditorias', 'anexos')
            .order_by('criado_em')
        )

    def _registrar_transicao(self, tarefa, origem, destino, usuario, justificativa=''):
        if origem == destino:
            return
        res_sub = tarefa.subtarefas.filter(tipo='resultado').first()
        snapshot = res_sub.opcao_selecionada if res_sub and res_sub.opcao_selecionada else ''
        Transicao.objects.create(
            tarefa=tarefa,
            origem=origem,
            destino=destino,
            usuario=usuario if usuario and usuario.is_authenticated else None,
            justificativa=justificativa or '',
            resultado_snapshot=snapshot,
        )

    def _resposta_orcamento_duplicado(self, numero, conflito):
        return Response({
            'detail': (
                f'O número de orçamento {numero} já está associado '
                f'a outra tarefa ativa.'
            ),
            'reason': 'numero_orcamento',
            'existing': {
                'id': conflito.id,
                'titulo': str(conflito),
            },
        }, status=status.HTTP_400_BAD_REQUEST)

    def create(self, request, *args, **kwargs):
        numero = (request.data.get('numero_orcamento') or '').strip()
        if not request.data.get('confirmar_orcamento_duplicado'):
            conflito = _verificar_orcamento_duplicado(numero)
            if conflito:
                return self._resposta_orcamento_duplicado(numero, conflito)
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        estado = 'a_fazer' if serializer.validated_data.get('data_prevista') else 'pendencias'
        responsavel = serializer.validated_data.get('responsavel') or self.request.user

        tarefa = serializer.save(criado_por=self.request.user, responsavel=responsavel, estado=estado)

        if not tarefa.subtarefas.exists():
            if tarefa.fluxo:
                ordem_count = 1
                for passo in tarefa.fluxo.passos.order_by('ordem'):
                    Subtarefa.objects.create(
                        tarefa=tarefa,
                        texto=passo.texto,
                        ordem=ordem_count,
                        tipo='fluxo',
                        opcoes=list(passo.opcoes or []),
                    )
                    ordem_count += 1
                Subtarefa.objects.create(
                    tarefa=tarefa,
                    texto='Resultado [Concluída | Cancelada]',
                    ordem=ordem_count,
                    tipo='resultado'
                )
            else:
                Subtarefa.objects.create(
                    tarefa=tarefa,
                    texto='Resultado [Concluída | Cancelada]',
                    ordem=1,
                    tipo='resultado'
                )

        _registrar_auditoria(
            tarefa, self.request.user, 'criacao',
            anteriores={},
            novos=_serializar_campos_auditaveis(tarefa),
        )

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        numero = (request.data.get('numero_orcamento')
                  or instance.numero_orcamento or '').strip()
        if (numero
                and not request.data.get('confirmar_orcamento_duplicado')):
            conflito = _verificar_orcamento_duplicado(numero, excluir_pk=instance.pk)
            if conflito:
                return self._resposta_orcamento_duplicado(numero, conflito)

        return self._update_impl(request, *args, **kwargs)

    def _update_impl(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        data = request.data
        estado_anterior = instance.estado
        campos_antes = _serializar_campos_auditaveis(instance)

        data_removida = 'data_prevista' in data and not data.get('data_prevista')
        novo_estado = data.get('estado', instance.estado)

        if (
            'estado' in data
            and data.get('estado') == 'pendencias'
            and instance.estado in ['a_fazer', 'em_andamento']
        ):
            if not data_removida:
                if hasattr(data, '_mutable'):
                    data._mutable = True
                data['data_prevista'] = None
                data_removida = True
                novo_estado = 'pendencias'

        if data_removida and 'estado' not in data and instance.estado in ['a_fazer', 'em_andamento']:
            novo_estado = 'pendencias'
            if isinstance(data, dict):
                data['estado'] = 'pendencias'
            elif hasattr(data, '_mutable'):
                data._mutable = True
                data['estado'] = 'pendencias'

        if novo_estado != instance.estado:
            permitidas = TRANSICOES_PERMITIDAS.get(instance.estado, set())
            if novo_estado not in permitidas:
                return Response(
                    {'detail': "Movimentação não permitida entre estas coleções."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        data_prevista = None if data_removida else data.get('data_prevista', instance.data_prevista)

        if novo_estado in ['a_fazer', 'em_andamento'] and not data_prevista:
            return Response(
                {'detail': "Tarefas nas coleções 'A fazer' ou 'Em andamento' exigem uma Data Prevista."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if novo_estado == 'concluido' and instance.estado != 'concluido':
            res_sub = instance.subtarefas.filter(tipo='resultado').first()
            if res_sub and not res_sub.opcao_selecionada and not res_sub.concluida:
                return Response(
                    {'detail': "A tarefa só pode ser concluída com o preenchimento da subtarefa de Resultado."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        response = super().update(request, *args, **kwargs, partial=partial)

        if response.status_code >= 400:
            return response

        instance.refresh_from_db()

        changed_fields = []
        if instance.estado == 'em_andamento' and not instance.data_real_inicio:
            instance.data_real_inicio = timezone.now()
            changed_fields.append('data_real_inicio')
        if instance.estado == 'concluido' and not instance.data_conclusao:
            instance.data_conclusao = timezone.now()
            changed_fields.append('data_conclusao')
        if changed_fields:
            instance.save(update_fields=changed_fields)

        if instance.estado != estado_anterior:
            self._registrar_transicao(instance, estado_anterior, instance.estado, request.user)

        campos_depois = _serializar_campos_auditaveis(instance)
        campos_alterados = {
            k for k in campos_antes if campos_antes[k] != campos_depois[k]
        }
        responsavel_mudou = 'responsavel' in campos_alterados

        if campos_alterados and not (responsavel_mudou and len(campos_alterados) == 1):
            _registrar_auditoria(
                instance, request.user, 'atualizacao',
                anteriores=campos_antes, novos=campos_depois,
            )

        if responsavel_mudou:
            justificativa = ''
            if hasattr(data, 'get'):
                justificativa = data.get('justificativa_responsavel', '') or ''
            _registrar_auditoria(
                instance, request.user, 'reassignacao_responsavel',
                anteriores={'responsavel': campos_antes['responsavel']},
                novos={'responsavel': campos_depois['responsavel']},
                justificativa=str(justificativa),
            )

        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='reabrir')
    def reabrir(self, request, pk=None):
        tarefa = self.get_object()

        if tarefa.estado != 'concluido':
            return Response(
                {'detail': 'Apenas tarefas na coleção "Concluído" podem ser reabertas.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        destino = request.data.get('destino')
        justificativa = (request.data.get('justificativa') or '').strip()

        if destino not in ['a_fazer', 'em_andamento']:
            return Response(
                {'detail': 'Destino inválido. Escolha "A fazer" ou "Em andamento".'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not justificativa:
            return Response(
                {'detail': 'A justificativa é obrigatória para reabrir a tarefa.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        nova_data = request.data.get('data_prevista', tarefa.data_prevista)
        if not nova_data:
            return Response(
                {'detail': 'Informe uma Data Prevista para reabrir a tarefa.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        origem = tarefa.estado
        campos_antes = _serializar_campos_auditaveis(tarefa)

        tarefa.estado = destino
        tarefa.data_prevista = nova_data
        tarefa.data_conclusao = None
        tarefa.save(update_fields=['estado', 'data_prevista', 'data_conclusao'])

        self._registrar_transicao(tarefa, origem, destino, request.user, justificativa)

        _registrar_auditoria(
            tarefa, request.user, 'reabertura',
            anteriores=campos_antes,
            novos=_serializar_campos_auditaveis(tarefa),
            justificativa=justificativa,
        )

        serializer = self.get_serializer(tarefa)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(
        detail=True,
        methods=['post'],
        url_path='anexos',
        parser_classes=[MultiPartParser, FormParser],
    )
    def upload_anexo(self, request, pk=None):
        tarefa = self.get_object()
        arquivo = request.FILES.get('arquivo')

        if not arquivo:
            return Response(
                {'detail': 'Nenhum arquivo enviado.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if tarefa.anexos.count() >= 20:
            return Response(
                {'detail': 'Limite de 20 anexos por tarefa atingido.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            validar_pdf(arquivo)
        except ValidationError as exc:
            msg = exc.messages[0] if getattr(exc, 'messages', None) else 'Arquivo inválido.'
            return Response({'detail': msg}, status=status.HTTP_400_BAD_REQUEST)

        anexo = Anexo(
            tarefa=tarefa,
            arquivo=arquivo,
            nome=arquivo.name,
            tamanho=arquivo.size,
        )
        try:
            anexo.full_clean()
            anexo.save()
        except ValidationError as exc:
            msg = exc.messages[0] if getattr(exc, 'messages', None) else 'Falha ao salvar anexo.'
            return Response({'detail': msg}, status=status.HTTP_400_BAD_REQUEST)

        serializer = AnexoSerializer(anexo, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['delete'], url_path=r'anexos/(?P<anexo_id>\d+)')
    def delete_anexo(self, request, pk=None, anexo_id=None):
        tarefa = self.get_object()
        try:
            anexo = tarefa.anexos.get(id=anexo_id)
        except Anexo.DoesNotExist:
            return Response(
                {'detail': 'Anexo não encontrado para esta tarefa.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        anexo.arquivo.delete(save=False)
        anexo.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class SubtarefaViewSet(viewsets.ModelViewSet):
    serializer_class = SubtarefaSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Subtarefa.objects.all().order_by('ordem')
        tarefa_id = self.request.query_params.get('tarefa')
        if tarefa_id:
            queryset = queryset.filter(tarefa_id=tarefa_id)
        return queryset

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.tipo == 'resultado':
            return Response(
                {'detail': 'Subtarefas do tipo resultado não podem ser excluídas.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)


class MetricasView(APIView):
    """RF-31: métricas operacionais do quadro."""
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        parameters=PARAMETROS_PERIODO,
        responses={200: OpenApiTypes.OBJECT},
        description=(
            'Calcula o pacote de métricas operacionais do quadro, '
            'opcionalmente limitado pelo período informado.'
        ),
    )
    def get(self, request):
        queryset = Tarefa.objects.filter(deletado=False)
        metricas = calcular_metricas(
            queryset,
            data_inicio=request.query_params.get('data_inicio'),
            data_fim=request.query_params.get('data_fim'),
        )
        return Response(metricas, status=status.HTTP_200_OK)


class ExportarTarefasView(APIView):
    """RF-32: exportação de tarefas em CSV."""
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        parameters=PARAMETROS_PERIODO,
        responses={(200, 'text/csv'): OpenApiTypes.BINARY},
        description='Exporta as tarefas em CSV separado por ponto e vírgula (BOM UTF-8).',
    )
    def get(self, request):
        queryset = Tarefa.objects.filter(deletado=False)
        csv_texto = exportar_tarefas_csv(
            queryset,
            data_inicio=request.query_params.get('data_inicio'),
            data_fim=request.query_params.get('data_fim'),
        )
        resposta = HttpResponse(csv_texto, content_type='text/csv; charset=utf-8')
        resposta['Content-Disposition'] = 'attachment; filename="tarefas.csv"'
        return resposta


class ExportarTransicoesView(APIView):
    """RF-32: exportação do histórico de transições em CSV."""
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        parameters=PARAMETROS_PERIODO,
        responses={(200, 'text/csv'): OpenApiTypes.BINARY},
        description='Exporta o histórico de transições em CSV separado por ponto e vírgula (BOM UTF-8).',
    )
    def get(self, request):
        queryset = Tarefa.objects.filter(deletado=False)
        csv_texto = exportar_transicoes_csv(
            queryset,
            data_inicio=request.query_params.get('data_inicio'),
            data_fim=request.query_params.get('data_fim'),
        )
        resposta = HttpResponse(csv_texto, content_type='text/csv; charset=utf-8')
        resposta['Content-Disposition'] = 'attachment; filename="transicoes.csv"'
        return resposta
