from django.contrib import admin
from .models import Contato, Fluxo, PassoFluxo, Tarefa, Subtarefa

class PassoFluxoInline(admin.TabularInline):
    model = PassoFluxo
    extra = 1
    ordering = ('ordem',)

@admin.register(Fluxo)
class FluxoAdmin(admin.ModelAdmin):
    list_display = ('nome', 'ativo', 'criado_em')
    search_fields = ('nome', 'descricao')
    inlines = [PassoFluxoInline]

@admin.register(Contato)
class ContatoAdmin(admin.ModelAdmin):
    list_display = ('nome', 'tipo', 'telefone', 'email', 'ativo')
    search_fields = ('nome', 'email', 'telefone')

class SubtarefaInline(admin.TabularInline):
    model = Subtarefa
    extra = 0

@admin.register(Tarefa)
class TarefaAdmin(admin.ModelAdmin):
    list_display = ('id', 'fluxo', 'contato', 'estado', 'data_prevista', 'criado_por')
    list_filter = ('estado', 'fluxo')
    inlines = [SubtarefaInline]
