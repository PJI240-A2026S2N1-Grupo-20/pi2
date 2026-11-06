from django.contrib.auth.models import AbstractUser, UserManager
from django.db import models


class UsuarioManager(UserManager):
    """Garante que o superusuário criado via createsuperuser seja administrador.

    Sem isso, o campo `papel` cai no default (`vendedor`) e o frontend
    esconde funcionalidades de administração, apesar de `is_superuser`
    e `is_staff` estarem corretos.
    """

    def create_superuser(self, username, email=None, password=None, **extra_fields):
        extra_fields.setdefault('papel', 'administrador')
        return super().create_superuser(username, email, password, **extra_fields)


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

    objects = UsuarioManager()

    @property
    def is_admin(self) -> bool:
        """Papel administrador OU superusuário. Usado pelo frontend e backend."""
        return self.papel == 'administrador' or self.is_superuser

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
