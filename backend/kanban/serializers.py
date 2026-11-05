from rest_framework import serializers
from .models import Contato, Fluxo, PassoFluxo, Tarefa, Subtarefa, Transicao
from accounts.models import Usuario


class ContatoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contato
        fields = ['id', 'nome', 'telefone', 'email', 'ativo', 'criado_em']


class PassoFluxoSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)

    class Meta:
        model = PassoFluxo
        fields = ['id', 'texto', 'ordem']


class FluxoSerializer(serializers.ModelSerializer):
    passos = PassoFluxoSerializer(many=True, required=False)

    class Meta:
        model = Fluxo
        fields = ['id', 'nome', 'ativo', 'passos']

    def create(self, validated_data):
        passos_data = validated_data.pop('passos', [])
        fluxo = Fluxo.objects.create(**validated_data)
        for i, passo in enumerate(passos_data):
            PassoFluxo.objects.create(
                fluxo=fluxo,
                texto=passo.get('texto'),
                ordem=passo.get('ordem', i + 1)
            )
        return fluxo

    def update(self, instance, validated_data):
        passos_data = validated_data.pop('passos', None)
        instance.nome = validated_data.get('nome', instance.nome)
        instance.ativo = validated_data.get('ativo', instance.ativo)
        instance.save()

        if passos_data is not None:
            instance.passos.all().delete()
            for i, passo in enumerate(passos_data):
                PassoFluxo.objects.create(
                    fluxo=instance,
                    texto=passo.get('texto'),
                    ordem=i + 1
                )
        return instance


class SubtarefaSerializer(serializers.ModelSerializer):
    tarefa = serializers.PrimaryKeyRelatedField(queryset=Tarefa.objects.all())

    class Meta:
        model = Subtarefa
        fields = ['id', 'tarefa', 'texto', 'concluida', 'ordem', 'tipo', 'opcao_selecionada']


class TransicaoSerializer(serializers.ModelSerializer):
    usuario_nome = serializers.ReadOnlyField(source='usuario.username', default=None)
    origem_display = serializers.CharField(source='get_origem_display', read_only=True)
    destino_display = serializers.CharField(source='get_destino_display', read_only=True)

    class Meta:
        model = Transicao
        fields = [
            'id', 'origem', 'origem_display', 'destino', 'destino_display',
            'usuario', 'usuario_nome', 'justificativa', 'resultado_snapshot', 'data_hora',
        ]
        read_only_fields = fields


class TarefaSerializer(serializers.ModelSerializer):
    subtarefas = SubtarefaSerializer(many=True, read_only=True)
    transicoes = TransicaoSerializer(many=True, read_only=True)
    fluxo_nome = serializers.ReadOnlyField(source='fluxo.nome', default=None)
    contato_nome = serializers.ReadOnlyField(source='contato.nome_exibicao', default=None)
    responsavel = serializers.PrimaryKeyRelatedField(queryset=Usuario.objects.all(), required=False, allow_null=True)
    responsavel_nome = serializers.SerializerMethodField()

    class Meta:
        model = Tarefa
        fields = [
            'id', 'fluxo', 'fluxo_nome', 'contato', 'contato_nome',
            'responsavel', 'responsavel_nome', 'estado', 'data_prevista',
            'data_real_inicio', 'data_conclusao',
            'observacoes', 'subtarefas', 'transicoes', 'criado_em', 'atualizado_em'
        ]
        read_only_fields = ['criado_por', 'criado_em', 'atualizado_em', 'data_real_inicio', 'data_conclusao']

    def get_responsavel_nome(self, obj):
        if obj.responsavel:
            return obj.responsavel.username
        if obj.criado_por:
            return obj.criado_por.username
        return 'Sem responsável'

    def validate_responsavel(self, value):
        """RN-02: apenas Subgerente/Gerente/Administrador podem reatribuir o responsável."""
        request = self.context.get('request')
        if not request or not request.user or not request.user.is_authenticated:
            return value

        if getattr(request.user, 'papel', None) != 'vendedor':
            return value

        if self.instance is None:
            if value is not None and value.id != request.user.id:
                raise serializers.ValidationError(
                    "Apenas Subgerentes, Gerentes ou Administradores podem atribuir outro responsável."
                )
        else:
            novo_id = value.id if value else None
            if novo_id != self.instance.responsavel_id:
                raise serializers.ValidationError(
                    "Apenas Subgerentes, Gerentes ou Administradores podem reatribuir o responsável."
                )
        return value
