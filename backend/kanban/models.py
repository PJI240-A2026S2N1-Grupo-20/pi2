from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError


class Contato(models.Model):
    TIPO_CHOICES = (
        ('cliente', 'Cliente'),
        ('fornecedor', 'Fornecedor'),
    )
    nome = models.CharField(max_length=255, blank=True, default='')
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES, default='cliente')
    telefone = models.CharField(max_length=30, blank=True, default='')
    email = models.EmailField(blank=True, default='')
    observacoes = models.TextField(blank=True, default='')
    ativo = models.BooleanField(default=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.nome or self.email or self.telefone or "Contato sem nome"

    @property
    def nome_exibicao(self):
        return str(self)


class Fluxo(models.Model):
    nome = models.CharField(max_length=255)
    ativo = models.BooleanField(default=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.nome


class PassoFluxo(models.Model):
    fluxo = models.ForeignKey(Fluxo, on_delete=models.CASCADE, related_name='passos')
    ordem = models.IntegerField(default=1)
    texto = models.CharField(max_length=255)
    opcoes = models.JSONField(default=list, blank=True)

    class Meta:
        ordering = ['ordem']

    def __str__(self):
        return f"{self.fluxo.nome} - Passo {self.ordem}: {self.texto}"


class Tarefa(models.Model):
    ESTADO_CHOICES = (
        ('pendencias', 'Pendências'),
        ('a_fazer', 'A fazer'),
        ('em_andamento', 'Em andamento'),
        ('concluido', 'Concluído'),
    )
    fluxo = models.ForeignKey(Fluxo, on_delete=models.SET_NULL, null=True, blank=True)
    contato = models.ForeignKey(Contato, on_delete=models.SET_NULL, null=True, blank=True, related_name='tarefas')
    responsavel = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tarefas_responsaveis'
    )
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, blank=True)
    data_prevista = models.DateField(null=True, blank=True)
    numero_orcamento = models.CharField(
        max_length=50, null=True, blank=True, db_index=True,
        help_text='Numero do orcamento associado a tarefa (RF-25/RF-26).'
    )
    validade_orcamento = models.DateField(null=True, blank=True)
    vl_produtos = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True,
    )
    vl_desconto = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True,
    )
    vl_icms_st = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True,
    )
    vl_total = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True,
    )
    data_real_inicio = models.DateTimeField(null=True, blank=True)
    data_conclusao = models.DateTimeField(null=True, blank=True)
    observacoes = models.TextField(blank=True, default='')
    criado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='tarefas_criadas'
    )
    deletado = models.BooleanField(default=False)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        if is_new and not self.estado:
            if self.data_prevista:
                self.estado = 'a_fazer'
            else:
                self.estado = 'pendencias'

        super().save(*args, **kwargs)

        if is_new:
            if self.fluxo:
                for passo in self.fluxo.passos.all():
                    Subtarefa.objects.create(
                        tarefa=self,
                        texto=passo.texto,
                        ordem=passo.ordem,
                        tipo='fluxo',
                        opcao_selecionada=None
                    )
            Subtarefa.objects.create(
                tarefa=self,
                texto='Resultado [Concluída | Cancelada]',
                tipo='resultado',
                ordem=999
            )

    def __str__(self):
        fluxo_nome = self.fluxo.nome if self.fluxo else ''
        contato_nome = str(self.contato) if self.contato else 'Contato não definido'
        if fluxo_nome:
            return f"{fluxo_nome} - {contato_nome}"
        return f"Tarefa - {contato_nome}"


class Subtarefa(models.Model):
    TIPO_CHOICES = (
        ('livre', 'Livre'),
        ('fluxo', 'Fluxo'),
        ('resultado', 'Resultado'),
        ('justificativa', 'Justificativa'),
    )
    tarefa = models.ForeignKey(Tarefa, on_delete=models.CASCADE, related_name='subtarefas')
    texto = models.CharField(max_length=255)
    opcao_selecionada = models.CharField(max_length=255, null=True, blank=True)
    concluida = models.BooleanField(default=False)
    ordem = models.IntegerField(default=0)
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES, default='livre')

    class Meta:
        ordering = ['ordem']

    def delete(self, *args, **kwargs):
        if self.tipo == 'resultado':
            raise ValidationError("A subtarefa de resultado é obrigatória e não pode ser excluída.")
        super().delete(*args, **kwargs)


class Transicao(models.Model):
    """RF-29: registro imutável das movimentações entre coleções."""
    tarefa = models.ForeignKey(Tarefa, on_delete=models.CASCADE, related_name='transicoes')
    origem = models.CharField(max_length=20, choices=Tarefa.ESTADO_CHOICES)
    destino = models.CharField(max_length=20, choices=Tarefa.ESTADO_CHOICES)
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    justificativa = models.TextField(blank=True, default='')
    resultado_snapshot = models.CharField(max_length=255, blank=True, default='')
    data_hora = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-data_hora']
        verbose_name = 'Transição'
        verbose_name_plural = 'Transições'

    def __str__(self):
        return f"{self.tarefa_id}: {self.origem} -> {self.destino}"


def validar_pdf(file):
    if not file.name.lower().endswith('.pdf'):
        raise ValidationError("Apenas arquivos em formato PDF são permitidos.")
    if file.size > 25 * 1024 * 1024:
        raise ValidationError("O tamanho do arquivo excede o limite máximo de 25 MB.")


class Anexo(models.Model):
    tarefa = models.ForeignKey(Tarefa, on_delete=models.CASCADE, related_name='anexos')
    arquivo = models.FileField(upload_to='anexos/%Y/%m/%d/', validators=[validar_pdf])
    nome = models.CharField(max_length=255)
    tamanho = models.BigIntegerField()
    numero_orcamento = models.CharField(max_length=50, blank=True, default='')
    enviado_em = models.DateTimeField(auto_now_add=True)

    def clean(self):
        if not self.pk and self.tarefa.anexos.count() >= 20:
            raise ValidationError("Limite de 20 anexos em PDF por tarefa foi atingido.")
        super().clean()

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


class Auditoria(models.Model):
    """RF-28 e RN-10: trilha imutável de modificações relevantes da tarefa.

    Cada registro guarda snapshots anteriores/posteriores em JSONB, o usuário
    responsável pela ação e, quando aplicável, uma justificativa textual.
    """
    TIPO_CHOICES = (
        ('criacao', 'Criação'),
        ('atualizacao', 'Atualização'),
        ('reabertura', 'Reabertura'),
        ('reassignacao_responsavel', 'Reatribuição de responsável'),
        ('anexo', 'Anexo'),
    )

    tarefa = models.ForeignKey(
        Tarefa, on_delete=models.CASCADE, related_name='auditorias'
    )
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    tipo_modificacao = models.CharField(max_length=30, choices=TIPO_CHOICES)
    entidade = models.CharField(max_length=50, default='tarefa')
    entidade_id = models.IntegerField(null=True, blank=True)
    dados_anteriores = models.JSONField(default=dict, blank=True)
    dados_novos = models.JSONField(default=dict, blank=True)
    justificativa = models.TextField(blank=True, default='')
    data_hora = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-data_hora']
        verbose_name = 'Auditoria'
        verbose_name_plural = 'Auditorias'

    def __str__(self):
        return (
            f"Tarefa {self.tarefa_id}: {self.get_tipo_modificacao_display()} "
            f"em {self.data_hora:%d/%m/%Y %H:%M}"
        )
