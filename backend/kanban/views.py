from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone

from .models import Contato, Fluxo, Tarefa, Subtarefa, Transicao
from .serializers import (
    ContatoSerializer,
    FluxoSerializer,
    TarefaSerializer,
    SubtarefaSerializer,
)
from accounts.permissions import IsAdministrador


# RN-01: matriz de transições (validada no servidor)
TRANSICOES_PERMITIDAS = {
    'pendencias': {'a_fazer'},
    'a_fazer': {'pendencias', 'em_andamento', 'concluido'},
    'em_andamento': {'pendencias', 'a_fazer', 'concluido'},
    'concluido': {'a_fazer', 'em_andamento'},
}


class ContatoViewSet(viewsets.ModelViewSet):
    queryset = Contato.objects.filter(ativo=True).order_by('nome')
    serializer_class = ContatoSerializer
    permission_classes = [permissions.IsAuthenticated]


class FluxoViewSet(viewsets.ModelViewSet):
    queryset = Fluxo.objects.filter(ativo=True).order_by('nome')
    serializer_class = FluxoSerializer

    def get_permissions(self):
        if self.request.method in ['POST', 'PUT', 'PATCH', 'DELETE']:
            return [IsAdministrador()]
        return [permissions.IsAuthenticated()]


class TarefaViewSet(viewsets.ModelViewSet):
    serializer_class = TarefaSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return (
            Tarefa.objects
            .filter(deletado=False)
            .select_related('fluxo', 'contato', 'responsavel', 'criado_por')
            .prefetch_related('subtarefas', 'transicoes')
            .order_by('criado_em')
        )

    # ---------------------------------------------------------------- helpers
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

    # ---------------------------------------------------------------- create
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
                        tipo='fluxo'
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

    # ---------------------------------------------------------------- update
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        data = request.data
        estado_anterior = instance.estado

        # RF-15: se a data prevista for removida, a tarefa retorna para Pendências
        data_removida = 'data_prevista' in data and not data.get('data_prevista')
        novo_estado = data.get('estado', instance.estado)

        # RN-01: mover A fazer / Em andamento -> Pendências força remoção da data
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

        # RN-01: matriz de transições
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

        # RN-05 / RN-06: datas de ciclo
        changed_fields = []
        if instance.estado == 'em_andamento' and not instance.data_real_inicio:
            instance.data_real_inicio = timezone.now()
            changed_fields.append('data_real_inicio')
        if instance.estado == 'concluido' and not instance.data_conclusao:
            instance.data_conclusao = timezone.now()
            changed_fields.append('data_conclusao')
        if changed_fields:
            instance.save(update_fields=changed_fields)

        # RF-29: registrar transição
        if instance.estado != estado_anterior:
            self._registrar_transicao(instance, estado_anterior, instance.estado, request.user)

        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    # ---------------------------------------------------------------- reopen
    @action(detail=True, methods=['post'], url_path='reabrir')
    def reabrir(self, request, pk=None):
        """RF-19 + RN-03 + RN-06: reabre tarefa concluída com justificativa obrigatória."""
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
        tarefa.estado = destino
        tarefa.data_prevista = nova_data
        tarefa.data_conclusao = None  # RN-06: preserva histórico, limpa ciclo atual
        tarefa.save(update_fields=['estado', 'data_prevista', 'data_conclusao'])

        self._registrar_transicao(tarefa, origem, destino, request.user, justificativa)

        serializer = self.get_serializer(tarefa)
        return Response(serializer.data, status=status.HTTP_200_OK)


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
