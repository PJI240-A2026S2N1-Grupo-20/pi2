from django.contrib import admin
from .models import Contato, Fluxo, PassoFluxo, Tarefa, Subtarefa, Transicao


class PassoFluxoInline(admin.TabularInline):
    model = PassoFluxo
    extra = 1
    ordering = ('ordem',)


@admin.register(Fluxo)
class FluxoAdmin(admin.ModelAdmin):
    list_display = ('nome', 'ativo', 'criado_em')
    search_fields = ('nome',)
    inlines = [PassoFluxoInline]


@admin.register(Contato)
class ContatoAdmin(admin.ModelAdmin):
    list_display = ('nome', 'tipo', 'telefone', 'email', 'ativo')
    search_fields = ('nome', 'email', 'telefone')


class SubtarefaInline(admin.TabularInline):
    model = Subtarefa
    extra = 0


class TransicaoInline(admin.TabularInline):
    model = Transicao
    extra = 0
    readonly_fields = ('origem', 'destino', 'usuario', 'justificativa', 'resultado_snapshot', 'data_hora')
    can_delete = False


@admin.register(Tarefa)
class TarefaAdmin(admin.ModelAdmin):
    list_display = ('id', 'fluxo', 'contato', 'estado', 'data_prevista', 'criado_por')
    list_filter = ('estado', 'fluxo')
    inlines = [SubtarefaInline, TransicaoInline]
