# Gerado manualmente para v0.7.0

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('kanban', '0003_alter_contato_nome'),
    ]

    operations = [
        migrations.AddField(
            model_name='tarefa',
            name='data_real_inicio',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='tarefa',
            name='data_conclusao',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.CreateModel(
            name='Transicao',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('origem', models.CharField(choices=[('pendencias', 'Pendências'), ('a_fazer', 'A fazer'), ('em_andamento', 'Em andamento'), ('concluido', 'Concluído')], max_length=20)),
                ('destino', models.CharField(choices=[('pendencias', 'Pendências'), ('a_fazer', 'A fazer'), ('em_andamento', 'Em andamento'), ('concluido', 'Concluído')], max_length=20)),
                ('justificativa', models.TextField(blank=True, default='')),
                ('resultado_snapshot', models.CharField(blank=True, default='', max_length=255)),
                ('data_hora', models.DateTimeField(auto_now_add=True)),
                ('tarefa', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='transicoes', to='kanban.tarefa')),
                ('usuario', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Transição',
                'verbose_name_plural': 'Transições',
                'ordering': ['-data_hora'],
            },
        ),
    ]
