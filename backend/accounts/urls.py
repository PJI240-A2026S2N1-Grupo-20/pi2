from django.urls import path
from .views import (
    LoginView,
    LogoutView,
    MeView,
    ConfiguracaoSistemaView,
    UsuarioListView,
)

urlpatterns = [
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('me/', MeView.as_view(), name='me'),
    path('configuracao/', ConfiguracaoSistemaView.as_view(), name='configuracao'),
    path('usuarios/', UsuarioListView.as_view(), name='usuarios'),
]
