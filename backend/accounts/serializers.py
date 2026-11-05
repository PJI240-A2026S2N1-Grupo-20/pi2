from rest_framework import serializers
from .models import Usuario, ConfiguracaoSistema


class UsuarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usuario
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'papel', 'limiar_amarelo_dias', 'limiar_laranja_dias']


class UsuarioResumoSerializer(serializers.ModelSerializer):
    """Serializer leve para uso em seletores de responsável (sem dados sensíveis)."""
    papel_display = serializers.CharField(source='get_papel_display', read_only=True)

    class Meta:
        model = Usuario
        fields = ['id', 'username', 'papel', 'papel_display']


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)


class ConfiguracaoSistemaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConfiguracaoSistema
        fields = ['id', 'limiar_amarelo_dias', 'limiar_laranja_dias', 'atualizado_em']
