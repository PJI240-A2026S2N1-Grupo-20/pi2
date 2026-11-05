"""Metricas operacionais e exportacao em CSV (RF-31 e RF-32)."""
import csv
import io
from datetime import date

from django.db.models import Count
from django.utils import timezone

from .models import Transicao


COLECOES = ('pendencias', 'a_fazer', 'em_andamento', 'concluido')
CABECALHO_TAREFAS = (
    'id', 'titulo', 'estado', 'fluxo', 'contato', 'responsavel',
    'data_prevista', 'data_real_inicio', 'data_conclusao', 'criado_em',
    'resultado',
)
CABECALHO_TRANSICOES = (
    'id', 'tarefa_id', 'origem', 'destino', 'usuario',
    'justificativa', 'resultado_snapshot', 'data_hora',
)


def _parse_data(valor):
    """Aceita date ou string no formato AAAA-MM-DD. Devolve date ou None."""
    if valor is None or valor == '':
        return None
    if isinstance(valor, date):
        return valor
    try:
        return date.fromisoformat(str(valor))
    except (TypeError, ValueError):
        return None


def _contar_por_estado(queryset):
    contagens = {estado: 0 for estado in COLECOES}
    for linha in queryset.values('estado').annotate(total=Count('id')):
        if linha['estado'] in contagens:
            contagens[linha['estado']] = linha['total']
    return contagens


def _contar_por_resultado(queryset, valor):
    return queryset.filter(
        estado='concluido',
        subtarefas__tipo='resultado',
        subtarefas__opcao_selecionada=valor,
    ).distinct().count()


def _tempo_medio_ciclo_dias(queryset):
    concluidas = queryset.filter(
        estado='concluido',
        data_real_inicio__isnull=False,
        data_conclusao__isnull=False,
    ).only('data_real_inicio', 'data_conclusao')

    duracoes = []
    for tarefa in concluidas:
        delta = tarefa.data_conclusao - tarefa.data_real_inicio
        duracoes.append(delta.total_seconds() / 86400.0)

    if not duracoes:
        return 0.0
    return round(sum(duracoes) / len(duracoes), 2)


def calcular_metricas(queryset, data_inicio=None, data_fim=None):
    """Calcula o pacote de metricas operacionais do quadro."""
    inicio = _parse_data(data_inicio)
    fim = _parse_data(data_fim)

    if inicio:
        queryset = queryset.filter(criado_em__date__gte=inicio)
    if fim:
        queryset = queryset.filter(criado_em__date__lte=fim)

    totais_por_estado = _contar_por_estado(queryset)
    total = sum(totais_por_estado.values())

    concluidas = _contar_por_resultado(queryset, 'Concluída')
    canceladas = _contar_por_resultado(queryset, 'Cancelada')

    encerradas = totais_por_estado['concluido']
    taxa_conclusao = 0.0
    if encerradas > 0:
        taxa_conclusao = round((concluidas / encerradas) * 100, 2)

    hoje = timezone.localdate()
    atrasadas = queryset.filter(
        estado__in=('a_fazer', 'em_andamento'),
        data_prevista__lt=hoje,
    ).count()

    return {
        'periodo': {
            'data_inicio': inicio.isoformat() if inicio else None,
            'data_fim': fim.isoformat() if fim else None,
        },
        'totais_por_estado': totais_por_estado,
        'total': total,
        'concluidas': concluidas,
        'canceladas': canceladas,
        'taxa_conclusao': taxa_conclusao,
        'tempo_medio_ciclo_dias': _tempo_medio_ciclo_dias(queryset),
        'atrasadas': atrasadas,
    }


def _aplicar_periodo(queryset, data_inicio, data_fim, campo_data):
    inicio = _parse_data(data_inicio)
    fim = _parse_data(data_fim)
    filtros = {}
    if inicio:
        filtros[f'{campo_data}__date__gte'] = inicio
    if fim:
        filtros[f'{campo_data}__date__lte'] = fim
    if filtros:
        queryset = queryset.filter(**filtros)
    return queryset


def exportar_tarefas_csv(queryset, data_inicio=None, data_fim=None):
    """Gera texto CSV (separador ponto e virgula, BOM UTF-8) das tarefas."""
    queryset = _aplicar_periodo(queryset, data_inicio, data_fim, 'criado_em')

    buffer = io.StringIO()
    buffer.write('\ufeff')
    writer = csv.writer(buffer, delimiter=';', lineterminator='\n')
    writer.writerow(CABECALHO_TAREFAS)

    for tarefa in (
        queryset
        .select_related('fluxo', 'contato', 'responsavel')
        .prefetch_related('subtarefas')
    ):
        subtarefa_resultado = next(
            (s for s in tarefa.subtarefas.all() if s.tipo == 'resultado'),
            None,
        )
        resultado = subtarefa_resultado.opcao_selecionada if subtarefa_resultado else ''
        writer.writerow([
            tarefa.id,
            str(tarefa),
            tarefa.estado,
            tarefa.fluxo.nome if tarefa.fluxo else '',
            str(tarefa.contato) if tarefa.contato else '',
            tarefa.responsavel.username if tarefa.responsavel else '',
            tarefa.data_prevista.isoformat() if tarefa.data_prevista else '',
            tarefa.data_real_inicio.isoformat() if tarefa.data_real_inicio else '',
            tarefa.data_conclusao.isoformat() if tarefa.data_conclusao else '',
            tarefa.criado_em.isoformat() if tarefa.criado_em else '',
            resultado or '',
        ])
    return buffer.getvalue()


def exportar_transicoes_csv(queryset, data_inicio=None, data_fim=None):
    """Gera texto CSV (separador ponto e virgula, BOM UTF-8) das transicoes."""
    ids = list(queryset.values_list('id', flat=True))
    transicoes = (
        Transicao.objects
        .filter(tarefa_id__in=ids)
        .select_related('usuario')
    )
    transicoes = _aplicar_periodo(transicoes, data_inicio, data_fim, 'data_hora')

    buffer = io.StringIO()
    buffer.write('\ufeff')
    writer = csv.writer(buffer, delimiter=';', lineterminator='\n')
    writer.writerow(CABECALHO_TRANSICOES)

    for transicao in transicoes.order_by('-data_hora'):
        writer.writerow([
            transicao.id,
            transicao.tarefa_id,
            transicao.origem,
            transicao.destino,
            transicao.usuario.username if transicao.usuario else '',
            transicao.justificativa or '',
            transicao.resultado_snapshot or '',
            transicao.data_hora.isoformat() if transicao.data_hora else '',
        ])
    return buffer.getvalue()
