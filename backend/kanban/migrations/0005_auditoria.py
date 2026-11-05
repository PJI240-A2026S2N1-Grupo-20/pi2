# Gerado para a versão v0.9.0 - RF-28 e RN-10
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('kanban', '0004_tarefa_datas_e_transicao'),
    ]

    operations = [
        migrations.CreateModel(
            name='Auditoria',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('tipo_modificacao', models.CharField(choices=[('criacao', 'Criação'), ('atualizacao', 'Atualização'), ('reabertura', 'Reabertura'), ('reassignacao_responsavel', 'Reatribuição de responsável'), ('anexo', 'Anexo')], max_length=30)),
                ('entidade', models.CharField(default='tarefa', max_length=50)),
                ('entidade_id', models.IntegerField(blank=True, null=True)),
                ('dados_anteriores', models.JSONField(blank=True, default=dict)),
                ('dados_novos', models.JSONField(blank=True, default=dict)),
                ('justificativa', models.TextField(blank=True, default='')),
                ('data_hora', models.DateTimeField(auto_now_add=True)),
                ('tarefa', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='auditorias', to='kanban.tarefa')),
                ('usuario', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Auditoria',
                'verbose_name_plural': 'Auditorias',
                'ordering': ['-data_hora'],
            },
        ),
    ]
