# Migracao gerada para a versao v1.1.0 - RF-24, RF-25 e RF-26
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('kanban', '0005_auditoria'),
    ]

    operations = [
        migrations.AddField(
            model_name='tarefa',
            name='numero_orcamento',
            field=models.CharField(
                blank=True, db_index=True, max_length=50, null=True,
                help_text='Numero do orcamento associado a tarefa (RF-25/RF-26).',
            ),
        ),
        migrations.AddField(
            model_name='tarefa',
            name='validade_orcamento',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='tarefa',
            name='vl_produtos',
            field=models.DecimalField(
                blank=True, decimal_places=2, max_digits=12, null=True,
            ),
        ),
        migrations.AddField(
            model_name='tarefa',
            name='vl_desconto',
            field=models.DecimalField(
                blank=True, decimal_places=2, max_digits=12, null=True,
            ),
        ),
        migrations.AddField(
            model_name='tarefa',
            name='vl_icms_st',
            field=models.DecimalField(
                blank=True, decimal_places=2, max_digits=12, null=True,
            ),
        ),
        migrations.AddField(
            model_name='tarefa',
            name='vl_total',
            field=models.DecimalField(
                blank=True, decimal_places=2, max_digits=12, null=True,
            ),
        ),
        migrations.AddField(
            model_name='anexo',
            name='numero_orcamento',
            field=models.CharField(blank=True, default='', max_length=50),
        ),
    ]
