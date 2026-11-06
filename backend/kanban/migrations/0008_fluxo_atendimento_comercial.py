# Migração de dados para a versão v1.3.0 - RF-21
#
# Cria o modelo de fluxo padrão com o nome "Atendimento Comercial", que é o
# mesmo nome consultado pelo parser de entrada assistida (RF-24) ao sugerir
# o fluxo a partir de uma conversa ou de um PDF de orçamento.
from django.db import migrations

NOME_FLUXO = 'Atendimento Comercial'
PASSOS = [
    'Preparar orçamento',
    'Enviar orçamento',
    'Combinar pagamento',
    'Combinar entrega',
    'Fechar no caixa',
    'Entrega realizada',
]


def criar_fluxo_atendimento_comercial(apps, schema_editor):
    Fluxo = apps.get_model('kanban', 'Fluxo')
    PassoFluxo = apps.get_model('kanban', 'PassoFluxo')

    if Fluxo.objects.filter(nome=NOME_FLUXO).exists():
        return

    fluxo = Fluxo.objects.create(nome=NOME_FLUXO, ativo=True)
    for indice, texto in enumerate(PASSOS, start=1):
        PassoFluxo.objects.create(
            fluxo=fluxo,
            ordem=indice,
            texto=texto,
            opcoes=[],
        )


def remover_fluxo_atendimento_comercial(apps, schema_editor):
    Fluxo = apps.get_model('kanban', 'Fluxo')
    Fluxo.objects.filter(nome=NOME_FLUXO).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('kanban', '0007_subtarefa_opcoes'),
    ]

    operations = [
        migrations.RunPython(
            criar_fluxo_atendimento_comercial,
            remover_fluxo_atendimento_comercial,
        ),
    ]
