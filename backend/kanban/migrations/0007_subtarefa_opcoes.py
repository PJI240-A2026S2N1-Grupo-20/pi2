# Migração gerada para a versão v1.3.0 - RF-23
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('kanban', '0006_campos_orcamento'),
    ]

    operations = [
        migrations.AddField(
            model_name='subtarefa',
            name='opcoes',
            field=models.JSONField(
                blank=True, default=list,
                help_text='Opções herdadas do passo de fluxo (RF-23).',
            ),
        ),
    ]
