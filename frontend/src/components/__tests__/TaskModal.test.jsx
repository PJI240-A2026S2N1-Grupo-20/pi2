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

    // createTarefa não deve ter sido chamado (Enter não submete)
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
});
