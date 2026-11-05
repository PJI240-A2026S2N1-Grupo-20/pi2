from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ContatoViewSet,
    FluxoViewSet,
    TarefaViewSet,
    SubtarefaViewSet,
    MetricasView,
    ExportarTarefasView,
    ExportarTransicoesView,
)

router = DefaultRouter()
router.register(r'contatos', ContatoViewSet, basename='contato')
router.register(r'fluxos', FluxoViewSet, basename='fluxo')
router.register(r'tarefas', TarefaViewSet, basename='tarefa')
router.register(r'subtarefas', SubtarefaViewSet, basename='subtarefa')

urlpatterns = [
    path('metricas/', MetricasView.as_view(), name='metricas'),
    path('exportar/tarefas/', ExportarTarefasView.as_view(), name='exportar-tarefas'),
    path('exportar/transicoes/', ExportarTransicoesView.as_view(), name='exportar-transicoes'),
    path('', include(router.urls)),
]
