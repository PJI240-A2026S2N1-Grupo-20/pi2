from django.db import models
from django.contrib.auth.models import AbstractUser

class Usuario(AbstractUser):
    PAPEL_CHOICES = [
        ('vendedor', 'Vendedor'),
        ('subgerente', 'Subgerente'),
        ('gerente', 'Gerente'),
        ('administrador', 'Administrador'),
    ]
    papel = models.CharField(max_length=20, choices=PAPEL_CHOICES, default='vendedor')
    limiar_amarelo_dias = models.IntegerField(null=True, blank=True, help_text="Limiar individual L1 em dias")
    limiar_laranja_dias = models.IntegerField(null=True, blank=True, help_text="Limiar individual L2 em dias")

    def __str__(self):
        return f"{self.username} ({self.get_papel_display()})"

class ConfiguracaoSistema(models.Model):
    limiar_amarelo_dias = models.IntegerField(default=2, help_text="Limiar global L1 em dias (Padrão: 2)")
    limiar_laranja_dias = models.IntegerField(default=5, help_text="Limiar global L2 em dias (Padrão: 5)")
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Configuração do Sistema"
        verbose_name_plural = "Configurações do Sistema"

    def __str__(self):
        return f"Configuração Global (L1={self.limiar_amarelo_dias}d, L2={self.limiar_laranja_dias}d)"
