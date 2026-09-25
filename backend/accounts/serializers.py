from rest_framework import serializers
from .models import Usuario, ConfiguracaoSistema

class UsuarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usuario
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'papel', 'limiar_amarelo_dias', 'limiar_laranja_dias']

class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()

class ConfiguracaoSistemaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConfiguracaoSistema
        fields = ['id', 'limiar_amarelo_dias', 'limiar_laranja_dias', 'atualizado_em']
