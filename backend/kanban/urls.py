from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ContatoViewSet, FluxoViewSet, TarefaViewSet, SubtarefaViewSet

router = DefaultRouter()
router.register(r'contatos', ContatoViewSet, basename='contato')
router.register(r'fluxos', FluxoViewSet, basename='fluxo')
router.register(r'tarefas', TarefaViewSet, basename='tarefa')
router.register(r'subtarefas', SubtarefaViewSet, basename='subtarefa')

urlpatterns = [
    path('', include(router.urls)),
]
