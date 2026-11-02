from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from .models import Usuario, ConfiguracaoSistema

class AccountsTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.config = ConfiguracaoSistema.objects.create(limiar_amarelo_dias=2, limiar_laranja_dias=5)
        
        self.vendedor = Usuario.objects.create_user(
            username='vendedor_test',
            email='vendedor@eletrokanban.com',
            password='Password123!',
            papel='vendedor'
        )
        self.admin = Usuario.objects.create_user(
            username='admin_test',
            email='admin@eletrokanban.com',
            password='Password123!',
            papel='administrador',
            is_staff=True,
            is_superuser=True
        )

    def test_login_sucesso(self):
        response = self.client.post(reverse('login'), {'username': 'vendedor_test', 'password': 'Password123!'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('user', response.data)
        self.assertEqual(response.data['limiares']['l1'], 2)
        self.assertEqual(response.data['limiares']['l2'], 5)

    def test_login_credenciais_invalidas(self):
        response = self.client.post(reverse('login'), {'username': 'vendedor_test', 'password': 'SenhaErrada!'})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_endpoint_protegido_sem_autenticacao(self):
        response = self.client.get(reverse('me'))
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_me_autenticado(self):
        self.client.force_authenticate(user=self.vendedor)
        response = self.client.get(reverse('me'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['user']['username'], 'vendedor_test')

    def test_bloqueio_rbac_vendedor_tentando_alterar_configuracao(self):
        self.client.force_authenticate(user=self.vendedor)
        response = self.client.put(reverse('configuracao'), {'limiar_amarelo_dias': 3}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_pode_alterar_configuracao(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.put(reverse('configuracao'), {'limiar_amarelo_dias': 3, 'limiar_laranja_dias': 6}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['limiar_amarelo_dias'], 3)

    def test_privacidade_email_redefinicao_senha(self):
        resp1 = self.client.post(reverse('password-reset'), {'email': 'vendedor@eletrokanban.com'})
        self.assertEqual(resp1.status_code, status.HTTP_200_OK)
        
        resp2 = self.client.post(reverse('password-reset'), {'email': 'inexistente@eletrokanban.com'})
        self.assertEqual(resp2.status_code, status.HTTP_200_OK)
        
        self.assertEqual(resp1.data['detail'], resp2.data['detail'])

    def test_limiar_individual_prevalece_sobre_global(self):
        self.vendedor.limiar_amarelo_dias = 1
        self.vendedor.save()
        self.client.force_authenticate(user=self.vendedor)
        response = self.client.get(reverse('me'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['limiares']['l1'], 1)
        self.assertEqual(response.data['limiares']['l2'], 5)

    def test_endpoint_lista_usuarios_retorna_campos_minimos(self):
        self.client.force_authenticate(user=self.vendedor)
        response = self.client.get(reverse('usuarios'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        usernames = [u['username'] for u in response.data]
        self.assertIn('vendedor_test', usernames)
        self.assertIn('admin_test', usernames)
        self.assertEqual(set(response.data[0].keys()), {'id', 'username', 'papel', 'papel_display'})
