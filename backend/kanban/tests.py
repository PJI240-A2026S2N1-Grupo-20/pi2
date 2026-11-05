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

    # ================================================================= v0.9.0
    def test_rf28_criacao_de_tarefa_registra_auditoria(self):
        """RF-28: uma entrada de auditoria deve ser criada ao criar a tarefa."""
        client = APIClient()
        client.force_authenticate(user=self.user)

        url = reverse('tarefa-list')
        payload = {
            'contato': self.contato.id,
            'data_prevista': '2026-10-01',
            'observacoes': 'Criada para o teste de auditoria',
        }
        response = client.post(url, payload, format='json')
        self.assertEqual(response.status_code, 201)
        tarefa_id = response.data['id']
        tarefa = Tarefa.objects.get(id=tarefa_id)

        auditorias = tarefa.auditorias.all()
        self.assertEqual(auditorias.count(), 1)
        aud = auditorias.first()
        self.assertEqual(aud.tipo_modificacao, 'criacao')
        self.assertEqual(aud.usuario_id, self.user.id)
        self.assertEqual(aud.dados_anteriores, {})
        self.assertEqual(aud.dados_novos['observacoes'], 'Criada para o teste de auditoria')
        self.assertEqual(aud.dados_novos['estado'], 'a_fazer')

    def test_rn10_reassignacao_responsavel_gera_auditoria_especifica(self):
        """RN-10: reatribuição de responsável precisa deixar rastro dedicado."""
        subgerente = Usuario.objects.create_user(
            username='sub_audit', password='x', papel='subgerente',
        )
        novo_resp = Usuario.objects.create_user(
            username='vend_novo', password='x', papel='vendedor',
        )
        client = APIClient()
        client.force_authenticate(user=subgerente)

        tarefa = Tarefa.objects.create(
            contato=self.contato, criado_por=self.user,
            responsavel=self.user, data_prevista=date(2026, 10, 1),
        )
        tarefa.auditorias.all().delete()

        url = reverse('tarefa-detail', args=[tarefa.id])
        response = client.patch(url, {
            'responsavel': novo_resp.id,
            'justificativa_responsavel': 'Redistribuicao de carga de trabalho',
        }, format='json')
        self.assertEqual(response.status_code, 200)

        tarefa.refresh_from_db()
        auditorias = tarefa.auditorias.filter(tipo_modificacao='reassignacao_responsavel')
        self.assertEqual(auditorias.count(), 1)
        aud = auditorias.first()
        self.assertEqual(aud.dados_anteriores['responsavel'], self.user.id)
        self.assertEqual(aud.dados_novos['responsavel'], novo_resp.id)
        self.assertEqual(aud.justificativa, 'Redistribuicao de carga de trabalho')
        self.assertEqual(aud.usuario_id, subgerente.id)

    def test_rf28_atualizacao_de_campo_gera_auditoria(self):
        """RF-28: alterações de campos relevantes precisam ser auditadas."""
        client = APIClient()
        client.force_authenticate(user=self.user)

        tarefa = Tarefa.objects.create(
            contato=self.contato, data_prevista=date(2026, 10, 1),
            criado_por=self.user, responsavel=self.user,
        )
        tarefa.auditorias.all().delete()

        url = reverse('tarefa-detail', args=[tarefa.id])
        response = client.patch(url, {'observacoes': 'Nova observacao'}, format='json')
        self.assertEqual(response.status_code, 200)

        tarefa.refresh_from_db()
        atualizacoes = tarefa.auditorias.filter(tipo_modificacao='atualizacao')
        self.assertGreaterEqual(atualizacoes.count(), 1)
        aud = atualizacoes.first()
        self.assertEqual(aud.dados_anteriores['observacoes'], '')
        self.assertEqual(aud.dados_novos['observacoes'], 'Nova observacao')

    def test_rf28_auditorias_expostas_no_serializer(self):
        """RF-28: o serializer da tarefa deve incluir as auditorias."""
        client = APIClient()
        client.force_authenticate(user=self.user)
        tarefa = Tarefa.objects.create(contato=self.contato, criado_por=self.user)

        url = reverse('tarefa-detail', args=[tarefa.id])
        response = client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertIn('auditorias', response.data)
        self.assertIsInstance(response.data['auditorias'], list)

    def test_rf28_reabertura_registra_auditoria(self):
        """RF-28: a reabertura também precisa constar na trilha de auditoria."""
        client = APIClient()
        client.force_authenticate(user=self.user)

        tarefa = Tarefa.objects.create(
            contato=self.contato, data_prevista=date(2026, 10, 1),
            criado_por=self.user, estado='concluido',
        )
        tarefa.data_conclusao = timezone.now()
        tarefa.save()
        tarefa.auditorias.all().delete()

        url = reverse('tarefa-reabrir', args=[tarefa.id])
        response = client.post(url, {
            'destino': 'em_andamento',
            'justificativa': 'Revisao solicitada pelo cliente',
        }, format='json')
        self.assertEqual(response.status_code, 200)

        tarefa.refresh_from_db()
        auditorias = tarefa.auditorias.filter(tipo_modificacao='reabertura')
        self.assertEqual(auditorias.count(), 1)
        aud = auditorias.first()
        self.assertEqual(aud.dados_anteriores['estado'], 'concluido')
        self.assertEqual(aud.dados_novos['estado'], 'em_andamento')
        self.assertEqual(aud.justificativa, 'Revisao solicitada pelo cliente')

    def test_rf28_sem_alteracao_nao_gera_auditoria(self):
        """RF-28: PATCH idêntico ao estado atual não deve gerar ruído na trilha."""
        client = APIClient()
        client.force_authenticate(user=self.user)
        tarefa = Tarefa.objects.create(
            contato=self.contato, data_prevista=date(2026, 10, 1),
            criado_por=self.user, responsavel=self.user,
            observacoes='Mesma observacao',
        )
        tarefa.auditorias.all().delete()

        url = reverse('tarefa-detail', args=[tarefa.id])
        response = client.patch(
            url, {'observacoes': 'Mesma observacao'}, format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(tarefa.auditorias.count(), 0)

    # ================================================================= v0.9.1
    def _criar_contato_existente(self):
        return Contato.objects.create(
            nome='Joao da Silva',
            email='joao@email.com',
            telefone='18999998888',
        )

    def test_rf14_bloqueia_nome_duplicado(self):
        existente = self._criar_contato_existente()
        client = APIClient()
        client.force_authenticate(user=self.user)

        url = reverse('contato-list')
        response = client.post(url, {'nome': 'Joao da Silva'}, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('existing', response.data)
        self.assertEqual(response.data['existing']['id'], existente.id)
        self.assertEqual(response.data['reason'], 'nome')

    def test_rf14_nome_duplicado_ignora_caixa(self):
        self._criar_contato_existente()
        client = APIClient()
        client.force_authenticate(user=self.user)

        url = reverse('contato-list')
        response = client.post(url, {'nome': 'joao da silva'}, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data['reason'], 'nome')

    def test_rf14_bloqueia_email_duplicado(self):
        self._criar_contato_existente()
        client = APIClient()
        client.force_authenticate(user=self.user)

        url = reverse('contato-list')
        response = client.post(url, {
            'nome': 'Outro nome',
            'email': 'joao@email.com',
        }, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data['reason'], 'email')

    def test_rf14_bloqueia_telefone_duplicado_normalizando_digitos(self):
        self._criar_contato_existente()
        client = APIClient()
        client.force_authenticate(user=self.user)

        url = reverse('contato-list')
        response = client.post(url, {
            'nome': 'Outro nome',
            'telefone': '(18) 99999-8888',
        }, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data['reason'], 'telefone')

    def test_rf14_permite_contato_com_campos_distintos(self):
        self._criar_contato_existente()
        client = APIClient()
        client.force_authenticate(user=self.user)

        url = reverse('contato-list')
        response = client.post(url, {
            'nome': 'Maria Souza',
            'email': 'maria@email.com',
            'telefone': '18988887777',
        }, format='json')
        self.assertEqual(response.status_code, 201)

    def test_rf14_contato_inativo_nao_bloqueia(self):
        existente = self._criar_contato_existente()
        existente.ativo = False
        existente.save()

        client = APIClient()
        client.force_authenticate(user=self.user)

        url = reverse('contato-list')
        response = client.post(url, {'nome': 'Joao da Silva'}, format='json')
        self.assertEqual(response.status_code, 201)

    def test_rf14_permite_editar_proprio_contato_sem_conflito(self):
        existente = self._criar_contato_existente()
        client = APIClient()
        client.force_authenticate(user=self.user)

        url = reverse('contato-detail', args=[existente.id])
        response = client.patch(url, {'nome': 'Joao da Silva'}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['id'], existente.id)

    def test_rf14_bloqueia_edicao_que_gera_conflito(self):
        self._criar_contato_existente()
        segundo = Contato.objects.create(
            nome='Maria Souza', email='maria@email.com', telefone='',
        )
        client = APIClient()
        client.force_authenticate(user=self.user)

        url = reverse('contato-detail', args=[segundo.id])
        response = client.patch(url, {'nome': 'Joao da Silva'}, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data['reason'], 'nome')

    # ================================================================= v1.0.0
    def test_rf31_metricas_calculam_totais_por_estado(self):
        """RF-31: metricas devem refletir a contagem real por colecao."""
        client = APIClient()
        client.force_authenticate(user=self.user)

        Tarefa.objects.create(contato=self.contato, criado_por=self.user)
        Tarefa.objects.create(contato=self.contato, criado_por=self.user)
        Tarefa.objects.create(
            contato=self.contato,
            criado_por=self.user,
            data_prevista=date(2026, 10, 1),
        )

        url = reverse('metricas')
        response = client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['totais_por_estado']['pendencias'], 2)
        self.assertEqual(response.data['totais_por_estado']['a_fazer'], 1)
        self.assertEqual(response.data['total'], 3)

    def test_rf31_taxa_conclusao_considera_resultado(self):
        """RF-31: taxa de conclusao desconsidera as tarefas canceladas."""
        client = APIClient()
        client.force_authenticate(user=self.user)

        concluida = Tarefa.objects.create(
            contato=self.contato,
            criado_por=self.user,
            data_prevista=date(2026, 10, 1),
            estado='concluido',
        )
        sub = concluida.subtarefas.filter(tipo='resultado').first()
        sub.opcao_selecionada = 'Concluída'
        sub.concluida = True
        sub.save()

        cancelada = Tarefa.objects.create(
            contato=self.contato,
            criado_por=self.user,
            data_prevista=date(2026, 10, 1),
            estado='concluido',
        )
        sub2 = cancelada.subtarefas.filter(tipo='resultado').first()
        sub2.opcao_selecionada = 'Cancelada'
        sub2.concluida = False
        sub2.save()

        url = reverse('metricas')
        response = client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['concluidas'], 1)
        self.assertEqual(response.data['canceladas'], 1)
        self.assertEqual(response.data['taxa_conclusao'], 50.0)

    def test_rf31_metricas_filtram_periodo(self):
        """RF-31: parametros data_inicio e data_fim limitam a contagem."""
        client = APIClient()
        client.force_authenticate(user=self.user)

        antiga = Tarefa.objects.create(contato=self.contato, criado_por=self.user)
        Tarefa.objects.filter(pk=antiga.pk).update(
            criado_em=timezone.now() - timedelta(days=60)
        )
        Tarefa.objects.create(contato=self.contato, criado_por=self.user)

        url = reverse('metricas')
        response = client.get(url, {'data_inicio': timezone.localdate().isoformat()})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['total'], 1)

    def test_rf31_metricas_requer_autenticacao(self):
        """RF-31: endpoint de metricas exige autenticacao."""
        client = APIClient()
        url = reverse('metricas')
        response = client.get(url)
        self.assertIn(response.status_code, [401, 403])

    def test_rf32_exportar_tarefas_csv(self):
        """RF-32: exportacao de tarefas em CSV."""
        client = APIClient()
        client.force_authenticate(user=self.user)
        Tarefa.objects.create(contato=self.contato, criado_por=self.user)

        url = reverse('exportar-tarefas')
        response = client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertIn('text/csv', response['Content-Type'])
        self.assertIn('attachment', response['Content-Disposition'])
        corpo = response.content.decode('utf-8')
        self.assertIn('titulo', corpo)
        self.assertIn('estado', corpo)

    def test_rf32_exportar_transicoes_csv(self):
        """RF-32: exportacao do historico de transicoes em CSV."""
        client = APIClient()
        client.force_authenticate(user=self.user)
        tarefa = Tarefa.objects.create(
            contato=self.contato,
            criado_por=self.user,
            data_prevista=date(2026, 10, 1),
        )

        url_update = reverse('tarefa-detail', args=[tarefa.id])
        client.patch(url_update, {'estado': 'em_andamento'}, format='json')

        url = reverse('exportar-transicoes')
        response = client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertIn('text/csv', response['Content-Type'])
        corpo = response.content.decode('utf-8')
        self.assertIn('tarefa_id', corpo)
        self.assertIn('em_andamento', corpo)

    def test_rf32_exportar_requer_autenticacao(self):
        """RF-32: os endpoints de exportacao exigem autenticacao."""
        client = APIClient()
        for nome in ('exportar-tarefas', 'exportar-transicoes'):
            response = client.get(reverse(nome))
            self.assertIn(response.status_code, [401, 403])
