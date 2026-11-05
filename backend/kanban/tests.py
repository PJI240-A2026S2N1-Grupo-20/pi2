from datetime import date, timedelta

from django.test import TestCase
from django.urls import reverse
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.exceptions import ValidationError
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import Usuario
from .models import Contato, Fluxo, PassoFluxo, Tarefa, Subtarefa, Anexo, Transicao


class KanbanBackendTestCase(TestCase):
    def setUp(self):
        self.user = Usuario.objects.create_user(
            username='vendedor_test',
            email='vendedor@eletrokanban.com',
            password='Password123!',
            papel='vendedor',
        )
        self.contato = Contato.objects.create(
            nome='Cliente Teste',
            tipo='cliente',
            telefone='18999999999',
            email='cliente@teste.com',
        )
        self.fluxo = Fluxo.objects.create(nome='Atendimento Comercial')
        PassoFluxo.objects.create(fluxo=self.fluxo, ordem=1, texto='Passo 1', opcoes=['Opcao A'])

    # ------------------------------------------------------------------ base
    def _test_direcionamento(self, data_prevista, estado_esperado):
        tarefa = Tarefa.objects.create(
            contato=self.contato,
            data_prevista=data_prevista,
            criado_por=self.user,
        )
        self.assertEqual(tarefa.estado, estado_esperado)

    def test_criar_tarefa_com_data_vai_para_a_fazer(self):
        self._test_direcionamento('2026-10-01', 'a_fazer')

    def test_criar_tarefa_sem_data_vai_para_pendencias(self):
        self._test_direcionamento(None, 'pendencias')

    def test_subtarefa_resultado_obrigatoria_e_nao_pode_ser_excluida(self):
        tarefa = Tarefa.objects.create(contato=self.contato, criado_por=self.user)
        sub_resultado = tarefa.subtarefas.filter(tipo='resultado').first()
        self.assertIsNotNone(sub_resultado)
        with self.assertRaises(ValidationError):
            sub_resultado.delete()

    def test_instanciacao_passos_fluxo_independente(self):
        tarefa = Tarefa.objects.create(
            fluxo=self.fluxo,
            contato=self.contato,
            criado_por=self.user,
        )
        sub_fluxo = tarefa.subtarefas.filter(tipo='fluxo').first()
        self.assertIsNotNone(sub_fluxo)

        sub_fluxo.texto = "Texto alterado na tarefa"
        sub_fluxo.save()

        passo_original = PassoFluxo.objects.get(id=self.fluxo.passos.first().id)
        self.assertEqual(passo_original.texto, "Passo 1")

    def test_upload_pdf_limite_tamanho(self):
        tarefa = Tarefa.objects.create(contato=self.contato, criado_por=self.user)
        grande_arquivo = SimpleUploadedFile("grande.pdf", b"0" * (25 * 1024 * 1024 + 1), content_type="application/pdf")
        anexo = Anexo(tarefa=tarefa, arquivo=grande_arquivo, nome="grande.pdf", tamanho=grande_arquivo.size)
        with self.assertRaises(ValidationError):
            anexo.full_clean()

    def test_upload_pdf_limite_quantidade(self):
        tarefa = Tarefa.objects.create(contato=self.contato, criado_por=self.user)
        pdf_valido = SimpleUploadedFile("teste.pdf", b"%PDF-1.4 test content", content_type="application/pdf")

        for i in range(20):
            Anexo.objects.create(tarefa=tarefa, arquivo=pdf_valido, nome=f"doc_{i}.pdf", tamanho=100)

        anexo_excedente = Anexo(tarefa=tarefa, arquivo=pdf_valido, nome="doc_21.pdf", tamanho=100)
        with self.assertRaises(ValidationError):
            anexo_excedente.full_clean()

    def test_nome_exibicao_contato_no_serializer_tarefa(self):
        tarefa = Tarefa.objects.create(contato=self.contato, criado_por=self.user)
        from .serializers import TarefaSerializer
        serializer = TarefaSerializer(tarefa)
        self.assertEqual(serializer.data['contato_nome'], 'Cliente Teste')

    def test_rf15_remover_data_prevista_retorna_para_pendencias(self):
        client = APIClient()
        client.force_authenticate(user=self.user)
        tarefa = Tarefa.objects.create(
            contato=self.contato,
            data_prevista=date(2026, 10, 1),
            criado_por=self.user,
        )
        self.assertEqual(tarefa.estado, 'a_fazer')

        url = reverse('tarefa-detail', args=[tarefa.id])
        response = client.patch(url, {'data_prevista': None}, format='json')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['estado'], 'pendencias')
        self.assertIsNone(response.data['data_prevista'])

        tarefa.refresh_from_db()
        self.assertEqual(tarefa.estado, 'pendencias')
        self.assertIsNone(tarefa.data_prevista)

    def test_rf13_vendedor_nao_pode_reassinar_responsavel(self):
        client = APIClient()
        client.force_authenticate(user=self.user)
        outro = Usuario.objects.create_user(username='outro_x', password='x', papel='vendedor')
        tarefa = Tarefa.objects.create(contato=self.contato, criado_por=self.user, responsavel=self.user)
        url = reverse('tarefa-detail', args=[tarefa.id])
        response = client.patch(url, {'responsavel': outro.id}, format='json')
        self.assertEqual(response.status_code, 400)

    def test_rf13_subgerente_pode_reassinar_responsavel(self):
        subgerente = Usuario.objects.create_user(username='sub_x', password='x', papel='subgerente')
        novo_resp = Usuario.objects.create_user(username='vend_y', password='x', papel='vendedor')
        client = APIClient()
        client.force_authenticate(user=subgerente)
        tarefa = Tarefa.objects.create(contato=self.contato, criado_por=self.user, responsavel=self.user)
        url = reverse('tarefa-detail', args=[tarefa.id])
        response = client.patch(url, {'responsavel': novo_resp.id}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['responsavel'], novo_resp.id)

    # ================================================================= v0.7.0
    def test_rn01_transicao_invalida_pendencias_para_em_andamento(self):
        client = APIClient()
        client.force_authenticate(user=self.user)
        tarefa = Tarefa.objects.create(contato=self.contato, criado_por=self.user)
        self.assertEqual(tarefa.estado, 'pendencias')

        url = reverse('tarefa-detail', args=[tarefa.id])
        response = client.patch(url, {'estado': 'em_andamento'}, format='json')
        self.assertEqual(response.status_code, 400)

    def test_rn01_transicao_invalida_pendencias_para_concluido(self):
        client = APIClient()
        client.force_authenticate(user=self.user)
        tarefa = Tarefa.objects.create(contato=self.contato, criado_por=self.user)

        url = reverse('tarefa-detail', args=[tarefa.id])
        response = client.patch(url, {'estado': 'concluido'}, format='json')
        self.assertEqual(response.status_code, 400)

    def test_rn05_e_rf29_mover_para_em_andamento_seta_data_real_inicio_e_registra(self):
        client = APIClient()
        client.force_authenticate(user=self.user)
        tarefa = Tarefa.objects.create(
            contato=self.contato,
            data_prevista=date(2026, 10, 1),
            criado_por=self.user,
        )
        self.assertEqual(tarefa.estado, 'a_fazer')

        url = reverse('tarefa-detail', args=[tarefa.id])
        response = client.patch(url, {'estado': 'em_andamento'}, format='json')
        self.assertEqual(response.status_code, 200)

        tarefa.refresh_from_db()
        self.assertEqual(tarefa.estado, 'em_andamento')
        self.assertIsNotNone(tarefa.data_real_inicio)
        self.assertEqual(tarefa.transicoes.count(), 1)
        trans = tarefa.transicoes.first()
        self.assertEqual(trans.origem, 'a_fazer')
        self.assertEqual(trans.destino, 'em_andamento')
        self.assertEqual(trans.usuario_id, self.user.id)

    def test_rn06_e_rf29_concluir_seta_data_conclusao_e_registra_snapshot(self):
        client = APIClient()
        client.force_authenticate(user=self.user)
        tarefa = Tarefa.objects.create(
            contato=self.contato,
            data_prevista=date(2026, 10, 1),
            criado_por=self.user,
        )
        res_sub = tarefa.subtarefas.filter(tipo='resultado').first()
        res_sub.opcao_selecionada = 'Concluída'
        res_sub.concluida = True
        res_sub.save()

        url = reverse('tarefa-detail', args=[tarefa.id])
        response = client.patch(url, {'estado': 'concluido'}, format='json')
        self.assertEqual(response.status_code, 200)

        tarefa.refresh_from_db()
        self.assertEqual(tarefa.estado, 'concluido')
        self.assertIsNotNone(tarefa.data_conclusao)
        trans = tarefa.transicoes.first()
        self.assertEqual(trans.origem, 'a_fazer')
        self.assertEqual(trans.destino, 'concluido')
        self.assertEqual(trans.resultado_snapshot, 'Concluída')

    def test_rn01_mover_a_fazer_para_pendencias_remove_data_prevista(self):
        client = APIClient()
        client.force_authenticate(user=self.user)
        tarefa = Tarefa.objects.create(
            contato=self.contato,
            data_prevista=date(2026, 10, 1),
            criado_por=self.user,
        )
        url = reverse('tarefa-detail', args=[tarefa.id])
        response = client.patch(url, {'estado': 'pendencias'}, format='json')
        self.assertEqual(response.status_code, 200)

        tarefa.refresh_from_db()
        self.assertEqual(tarefa.estado, 'pendencias')
        self.assertIsNone(tarefa.data_prevista)

    def test_rf19_reabrir_exige_justificativa(self):
        client = APIClient()
        client.force_authenticate(user=self.user)
        tarefa = Tarefa.objects.create(
            contato=self.contato,
            data_prevista=date(2026, 10, 1),
            criado_por=self.user,
            estado='concluido',
        )
        tarefa.data_conclusao = timezone.now()
        tarefa.save()

        url = reverse('tarefa-reabrir', args=[tarefa.id])
        response = client.post(url, {'destino': 'a_fazer'}, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('justificativa', response.data['detail'].lower())

    def test_rf19_reabrir_sucesso_preserva_inicio_e_limpa_conclusao(self):
        client = APIClient()
        client.force_authenticate(user=self.user)
        tarefa = Tarefa.objects.create(
            contato=self.contato,
            data_prevista=date(2026, 10, 1),
            criado_por=self.user,
            estado='concluido',
        )
        tarefa.data_real_inicio = timezone.now() - timedelta(days=2)
        tarefa.data_conclusao = timezone.now()
        tarefa.save()
        inicio_original = tarefa.data_real_inicio

        url = reverse('tarefa-reabrir', args=[tarefa.id])
        response = client.post(url, {
            'destino': 'em_andamento',
            'justificativa': 'Cliente solicitou revisão do orçamento.',
        }, format='json')
        self.assertEqual(response.status_code, 200)

        tarefa.refresh_from_db()
        self.assertEqual(tarefa.estado, 'em_andamento')
        self.assertIsNone(tarefa.data_conclusao)
        self.assertEqual(tarefa.data_real_inicio, inicio_original)
        self.assertEqual(tarefa.transicoes.count(), 1)
        trans = tarefa.transicoes.first()
        self.assertEqual(trans.origem, 'concluido')
        self.assertEqual(trans.destino, 'em_andamento')
        self.assertEqual(trans.justificativa, 'Cliente solicitou revisão do orçamento.')

    def test_rf19_reabrir_apenas_de_concluido(self):
        client = APIClient()
        client.force_authenticate(user=self.user)
        tarefa = Tarefa.objects.create(
            contato=self.contato,
            data_prevista=date(2026, 10, 1),
            criado_por=self.user,
        )  # estado = a_fazer

        url = reverse('tarefa-reabrir', args=[tarefa.id])
        response = client.post(url, {'destino': 'em_andamento', 'justificativa': 'x'}, format='json')
        self.assertEqual(response.status_code, 400)

    def test_rf19_reabrir_destino_invalido(self):
        client = APIClient()
        client.force_authenticate(user=self.user)
        tarefa = Tarefa.objects.create(
            contato=self.contato,
            data_prevista=date(2026, 10, 1),
            criado_por=self.user,
            estado='concluido',
        )
        tarefa.data_conclusao = timezone.now()
        tarefa.save()

        url = reverse('tarefa-reabrir', args=[tarefa.id])
        response = client.post(url, {'destino': 'pendencias', 'justificativa': 'x'}, format='json')
        self.assertEqual(response.status_code, 400)

    def test_rf19_reabrir_exige_data_prevista_quando_ausente(self):
        client = APIClient()
        client.force_authenticate(user=self.user)
        # Cria com data, transiciona para concluído e depois remove a data via admin
        tarefa = Tarefa.objects.create(
            contato=self.contato,
            data_prevista=date(2026, 10, 1),
            criado_por=self.user,
            estado='concluido',
        )
        tarefa.data_prevista = None
        tarefa.data_conclusao = timezone.now()
        tarefa.save()

        url = reverse('tarefa-reabrir', args=[tarefa.id])
        response = client.post(url, {'destino': 'a_fazer', 'justificativa': 'x'}, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('data prevista', response.data['detail'].lower())
