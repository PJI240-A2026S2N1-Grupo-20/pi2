"""Testes exclusivos da versão v1.3.0: RF-15, RF-21, RF-23 e RNF-04."""
from datetime import date

from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from accounts.models import Usuario
from .models import Contato, Fluxo, PassoFluxo, Subtarefa, Tarefa


class Rf23OpcoesPassoTestCase(TestCase):
    """RF-23: opções de passo são copiadas para a subtarefa na instanciação."""

    def setUp(self):
        self.user = Usuario.objects.create_user(
            username='vendedor_rf23', password='x', papel='vendedor',
        )
        self.contato = Contato.objects.create(nome='Cliente RF23')
        self.fluxo = Fluxo.objects.create(nome='Fluxo com opções')
        PassoFluxo.objects.create(
            fluxo=self.fluxo, ordem=1, texto='Confirmar pagamento',
            opcoes=['Dinheiro', 'PIX', 'Cartão'],
        )

    def test_subtarefa_herda_opcoes_do_passo(self):
        tarefa = Tarefa.objects.create(
            fluxo=self.fluxo, contato=self.contato, criado_por=self.user,
        )
        sub = tarefa.subtarefas.filter(tipo='fluxo').first()
        self.assertIsNotNone(sub)
        self.assertEqual(sub.opcoes, ['Dinheiro', 'PIX', 'Cartão'])

    def test_editar_passo_nao_altera_subtarefa_existente(self):
        tarefa = Tarefa.objects.create(
            fluxo=self.fluxo, contato=self.contato, criado_por=self.user,
        )
        passo = self.fluxo.passos.first()
        passo.opcoes = ['Boleto']
        passo.save()

        sub = tarefa.subtarefas.filter(tipo='fluxo').first()
        sub.refresh_from_db()
        self.assertEqual(sub.opcoes, ['Dinheiro', 'PIX', 'Cartão'])

    def test_criar_fluxo_com_opcoes_via_api(self):
        client = APIClient()
        admin = Usuario.objects.create_user(
            username='admin_rf23', password='x', papel='administrador',
        )
        client.force_authenticate(user=admin)
        url = reverse('fluxo-list')
        response = client.post(url, {
            'nome': 'Fluxo API',
            'passos': [
                {'texto': 'Passo API', 'ordem': 1, 'opcoes': ['A', 'B']},
            ],
        }, format='json')
        self.assertEqual(response.status_code, 201)
        passo = PassoFluxo.objects.get(fluxo_id=response.data['id'])
        self.assertEqual(passo.opcoes, ['A', 'B'])


class Rf21FluxoAtendimentoComercialTestCase(TestCase):
    """RF-21: migração cria o fluxo padrão com o nome correto."""

    def test_fluxo_atendimento_comercial_existe(self):
        fluxo = Fluxo.objects.filter(nome='Atendimento Comercial').first()
        self.assertIsNotNone(fluxo)
        textos = list(fluxo.passos.order_by('ordem').values_list('texto', flat=True))
        self.assertEqual(textos, [
            'Preparar orçamento',
            'Enviar orçamento',
            'Combinar pagamento',
            'Combinar entrega',
            'Fechar no caixa',
            'Entrega realizada',
        ])

    def test_fluxo_legado_nao_existe(self):
        self.assertFalse(
            Fluxo.objects.filter(nome='Fluxo Comercial Padrão').exists()
        )

    def test_parser_encontra_fluxo_sugerido(self):
        """Simula o fluxo do frontend: parser sugere 'Atendimento Comercial'
        e o backend precisa ter esse fluxo para o usuário selecionar."""
        self.assertTrue(
            Fluxo.objects.filter(nome='Atendimento Comercial', ativo=True).exists()
        )


class Rnf04SwaggerPublicoTestCase(TestCase):
    """RNF-04: o schema OpenAPI deve ser público."""

    def test_schema_e_publico(self):
        client = APIClient()
        response = client.get(reverse('schema'))
        self.assertEqual(response.status_code, 200)
