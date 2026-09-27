from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from .models import Contato, Fluxo, Tarefa, Subtarefa
from .serializers import ContatoSerializer, FluxoSerializer, TarefaSerializer, SubtarefaSerializer
from accounts.permissions import IsAdministrador

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
        return Tarefa.objects.filter(deletado=False).prefetch_related('subtarefas').order_by('criado_em')

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

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        novo_estado = request.data.get('estado', instance.estado)
        data_prevista = request.data.get('data_prevista', instance.data_prevista)

        if novo_estado in ['a_fazer', 'em_andamento'] and not data_prevista:
            return Response(
                {'detail': "Tarefas nas coleções 'A fazer' ou 'Em andamento' exigem uma Data Prevista."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if novo_estado == 'concluido':
            res_sub = instance.subtarefas.filter(tipo='resultado').first()
            if res_sub and not res_sub.opcao_selecionada and not res_sub.concluida:
                return Response(
                    {'detail': "A tarefa só pode ser concluída com o preenchimento da subtarefa de Resultado."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        return super().update(request, *args, **kwargs, partial=partial)

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
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().destroy(request, *args, **kwargs)
