from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.exceptions import ValidationError
from accounts.models import Usuario
from .models import Contato, Fluxo, PassoFluxo, Tarefa, Subtarefa, Anexo

class KanbanBackendTestCase(TestCase):
    def setUp(self):
        self.user = Usuario.objects.create_user(
            username='vendedor_test',
            email='vendedor@eletrokanban.com',
            password='Password123!',
            papel='vendedor'
        )
        self.contato = Contato.objects.create(
            nome='Cliente Teste',
            tipo='cliente',
            telefone='18999999999',
            email='cliente@teste.com'
        )
        self.fluxo = Fluxo.objects.create(nome='Atendimento Comercial')
        PassoFluxo.objects.create(fluxo=self.fluxo, ordem=1, texto='Passo 1', opcoes=['Opcao A'])

    test_criar_tarefa_com_data_vai_para_a_fazer = lambda self: self._test_direcionamento('2026-10-01', 'a_fazer')
    test_criar_tarefa_sem_data_vai_para_pendencias = lambda self: self._test_direcionamento(None, 'pendencias')

    def _test_direcionamento(self, data_prevista, estado_esperado):
        tarefa = Tarefa.objects.create(
            contato=self.contato,
            data_prevista=data_prevista,
            criado_por=self.user
        )
        self.assertEqual(tarefa.estado, estado_esperado)

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
            criado_por=self.user
        )
        sub_fluxo = tarefa.subtarefas.filter(tipo='fluxo').first()
        self.assertIsNotNone(sub_fluxo)
        
        # Alterar a subtarefa não altera o modelo PassoFluxo original (RF-22)
        sub_fluxo.texto = "Texto alterado na tarefa"
        sub_fluxo.save()
        
        passo_original = PassoFluxo.objects.get(id=self.fluxo.passos.first().id)
        self.assertEqual(passo_original.texto, "Passo 1")

    def test_upload_pdf_limite_tamanho(self):
        tarefa = Tarefa.objects.create(contato=self.contato, criado_por=self.user)
        # Arquivo fake simulando > 25MB
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
        
        # Importado localmente para evitar dependência circular caso exista
        from .serializers import TarefaSerializer
        
        serializer = TarefaSerializer(tarefa)
        self.assertEqual(serializer.data['contato_nome'], 'Cliente Teste')
