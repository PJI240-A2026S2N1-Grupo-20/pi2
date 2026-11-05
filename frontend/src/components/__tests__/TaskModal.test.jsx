import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TaskModal } from '../TaskModal';
import * as kanbanApi from '../../api/kanbanApi';
import { vi } from 'vitest';

vi.mock('../../api/kanbanApi');

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 99, username: 'admin_test', papel: 'administrador' },
    limiares: { l1: 2, l2: 5 },
  }),
}));

describe('TaskModal - Testes de Contato por Nome, E-mail e Telefone', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    kanbanApi.getContatos.mockResolvedValue({
      data: [
        { id: 1, nome: 'João da Silva', telefone: '18999999999', email: 'joao@email.com' },
        { id: 2, nome: '', telefone: '', email: 'contato@fornecedor.com' },
      ],
    });
    kanbanApi.getFluxos.mockResolvedValue({
      data: [{ id: 10, nome: 'Atendimento Comercial' }],
    });
    kanbanApi.getUsuarios.mockResolvedValue({
      data: [
        { id: 99, username: 'admin_test', papel: 'administrador', papel_display: 'Administrador' },
      ],
    });
    kanbanApi.createTarefa.mockResolvedValue({ data: { id: 123, anexos: [] } });
    kanbanApi.uploadAnexo.mockResolvedValue({
      data: { id: 1, nome: 'orcamento.pdf', tamanho: 100, url: '' },
    });
  });

  test('Renderiza o modal e permite selecionar contato por e-mail', async () => {
    render(<TaskModal onClose={vi.fn()} onTaskSaved={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/contato@fornecedor.com/i)).toBeInTheDocument();
    });
  });

  test('Permite abrir o formulário de novo contato rápido', async () => {
    render(<TaskModal onClose={vi.fn()} onTaskSaved={vi.fn()} />);

    const btnNovo = await screen.findByRole('button', { name: /Novo/i });
    fireEvent.click(btnNovo);

    expect(
      screen.getByPlaceholderText('Digite Nome, E-mail ou Telefone *')
    ).toBeInTheDocument();
  });

  test('Exibe o campo Responsável para Administrador', async () => {
    render(<TaskModal onClose={vi.fn()} onTaskSaved={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText('Responsável')).toBeInTheDocument();
    });
    const selectResponsavel = screen.getByText('Responsável').nextElementSibling;
    expect(selectResponsavel).not.toBeDisabled();
  });

  // --------------------------------------------------------------- v0.7.0
  test('v0.7.0: Enter no campo de busca NÃO submete o formulário', async () => {
    render(<TaskModal onClose={vi.fn()} onTaskSaved={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Buscar por nome/)).toBeInTheDocument();
    });

    const busca = screen.getByPlaceholderText(/Buscar por nome/);
    fireEvent.change(busca, { target: { value: 'João' } });
    fireEvent.keyDown(busca, { key: 'Enter', code: 'Enter' });

    expect(kanbanApi.createTarefa).not.toHaveBeenCalled();
  });

  test('v0.7.0: contador de resultados aparece durante a busca', async () => {
    render(<TaskModal onClose={vi.fn()} onTaskSaved={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Buscar por nome/)).toBeInTheDocument();
    });

    const busca = screen.getByPlaceholderText(/Buscar por nome/);

    fireEvent.change(busca, { target: { value: 'inexistente' } });
    expect(await screen.findByText(/Nenhum contato corresponde à busca/i)).toBeInTheDocument();

    fireEvent.change(busca, { target: { value: 'João' } });
    expect(
      await screen.findByText(/1 contato encontrado\. Pressione Enter para selecioná-lo/i)
    ).toBeInTheDocument();
  });

  test('v0.7.0: Enter com um único resultado auto-seleciona o contato', async () => {
    render(<TaskModal onClose={vi.fn()} onTaskSaved={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Buscar por nome/)).toBeInTheDocument();
    });

    const busca = screen.getByPlaceholderText(/Buscar por nome/);
    fireEvent.change(busca, { target: { value: 'João' } });
    fireEvent.keyDown(busca, { key: 'Enter', code: 'Enter' });

    const selectContato = document.getElementById('task-contato');
    expect(selectContato).not.toBeNull();
    expect(selectContato.value).toBe('1');
  });

  // --------------------------------------------------------------- v0.8.0
  test('v0.8.0: criacao permite selecionar PDF antes de salvar', async () => {
    render(<TaskModal onClose={vi.fn()} onTaskSaved={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Buscar por nome/)).toBeInTheDocument();
    });

    const pdf = new File(['%PDF-1.4 test'], 'orcamento.pdf', { type: 'application/pdf' });
    const inputArquivo = screen.getByLabelText(/selecionar arquivo pdf/i);
    fireEvent.change(inputArquivo, { target: { files: [pdf] } });

    expect(await screen.findByText('orcamento.pdf')).toBeInTheDocument();
    // Nada foi enviado ainda (modo staging)
    expect(kanbanApi.uploadAnexo).not.toHaveBeenCalled();
  });

  test('v0.8.0: ao criar tarefa com PDFs, envia apos receber o id', async () => {
    const onTaskSaved = vi.fn();
    const onClose = vi.fn();

    render(<TaskModal onClose={onClose} onTaskSaved={onTaskSaved} />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Buscar por nome/)).toBeInTheDocument();
    });

    const pdf = new File(['%PDF-1.4 test'], 'orcamento.pdf', { type: 'application/pdf' });
    const inputArquivo = screen.getByLabelText(/selecionar arquivo pdf/i);
    fireEvent.change(inputArquivo, { target: { files: [pdf] } });

    expect(await screen.findByText('orcamento.pdf')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Criar Tarefa/i }));

    await waitFor(() => {
      expect(kanbanApi.createTarefa).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(kanbanApi.uploadAnexo).toHaveBeenCalledWith(123, expect.any(File));
    });
    await waitFor(() => {
      expect(onTaskSaved).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  test('v0.8.0: arquivo nao-PDF e rejeitado no modo de criacao', async () => {
    render(<TaskModal onClose={vi.fn()} onTaskSaved={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Buscar por nome/)).toBeInTheDocument();
    });

    const txt = new File(['hello'], 'nota.txt', { type: 'text/plain' });
    const inputArquivo = screen.getByLabelText(/selecionar arquivo pdf/i);
    fireEvent.change(inputArquivo, { target: { files: [txt] } });

    expect(
      await screen.findByText(/apenas arquivos em formato PDF/i)
    ).toBeInTheDocument();
    expect(kanbanApi.createTarefa).not.toHaveBeenCalled();
  });
});
