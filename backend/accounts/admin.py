from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Usuario, ConfiguracaoSistema

@admin.register(Usuario)
class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ('Controle EletroKanban', {'fields': ('papel', 'limiar_amarelo_dias', 'limiar_laranja_dias')}),
    )
    list_display = ('username', 'email', 'first_name', 'last_name', 'papel', 'is_active', 'is_staff')
    list_filter = ('papel', 'is_active', 'is_staff')

@admin.register(ConfiguracaoSistema)
class ConfiguracaoSistemaAdmin(admin.ModelAdmin):
    list_display = ('id', 'limiar_amarelo_dias', 'limiar_laranja_dias', 'atualizado_em')
