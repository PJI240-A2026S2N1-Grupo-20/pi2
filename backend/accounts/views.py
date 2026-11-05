from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.contrib.auth import authenticate, login, logout
from django.views.decorators.csrf import ensure_csrf_cookie
from django.utils.decorators import method_decorator
from .models import Usuario, ConfiguracaoSistema
from .serializers import (
    UsuarioSerializer,
    UsuarioResumoSerializer,
    LoginSerializer,
    ConfiguracaoSistemaSerializer,
)
from .permissions import IsAdministrador


def get_effective_thresholds(user):
    config = ConfiguracaoSistema.objects.first()
    if not config:
        config = ConfiguracaoSistema.objects.create(limiar_amarelo_dias=2, limiar_laranja_dias=5)

    l1 = user.limiar_amarelo_dias if user.limiar_amarelo_dias is not None else config.limiar_amarelo_dias
    l2 = user.limiar_laranja_dias if user.limiar_laranja_dias is not None else config.limiar_laranja_dias
    return l1, l2


@method_decorator(ensure_csrf_cookie, name='dispatch')
class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            username = serializer.validated_data['username']
            password = serializer.validated_data['password']
            user = authenticate(request, username=username, password=password)
            if user is not None:
                if not user.is_active:
                    return Response({'detail': 'Usuário desativado.'}, status=status.HTTP_403_FORBIDDEN)
                login(request, user)
                user_data = UsuarioSerializer(user).data
                l1, l2 = get_effective_thresholds(user)
                return Response({
                    'user': user_data,
                    'limiares': {'l1': l1, 'l2': l2},
                    'detail': 'Login realizado com sucesso.'
                }, status=status.HTTP_200_OK)
            return Response({'detail': 'Credenciais inválidas.'}, status=status.HTTP_401_UNAUTHORIZED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        logout(request)
        return Response({'detail': 'Logout realizado com sucesso.'}, status=status.HTTP_200_OK)


@method_decorator(ensure_csrf_cookie, name='dispatch')
class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        user_data = UsuarioSerializer(user).data
        l1, l2 = get_effective_thresholds(user)
        return Response({
            'user': user_data,
            'limiares': {'l1': l1, 'l2': l2}
        }, status=status.HTTP_200_OK)


class ConfiguracaoSistemaView(APIView):
    def get_permissions(self):
        if self.request.method in ['PUT', 'PATCH']:
            return [IsAdministrador()]
        return [permissions.IsAuthenticated()]

    def get(self, request):
        config = ConfiguracaoSistema.objects.first()
        if not config:
            config = ConfiguracaoSistema.objects.create(limiar_amarelo_dias=2, limiar_laranja_dias=5)
        serializer = ConfiguracaoSistemaSerializer(config)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request):
        config = ConfiguracaoSistema.objects.first()
        if not config:
            config = ConfiguracaoSistema.objects.create(limiar_amarelo_dias=2, limiar_laranja_dias=5)
        serializer = ConfiguracaoSistemaSerializer(config, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UsuarioListView(APIView):
    """Lista usuários ativos para seleção de responsável (RF-13)."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        usuarios = Usuario.objects.filter(is_active=True).order_by('username')
        serializer = UsuarioResumoSerializer(usuarios, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
