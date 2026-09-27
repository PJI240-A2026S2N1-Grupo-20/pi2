import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TaskModal } from '../TaskModal';
import * as kanbanApi from '../../api/kanbanApi';
import { vi } from 'vitest';

vi.mock('../../api/kanbanApi');

describe('TaskModal - Testes de Contato por Nome, E-mail e Telefone', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    kanbanApi.getContatos.mockResolvedValue({
      data: [
        { id: 1, nome: 'João da Silva', telefone: '18999999999', email: 'joao@email.com' },
        { id: 2, nome: '', telefone: '', email: 'contato@fornecedor.com' }
      ]
    });
    kanbanApi.getFluxos.mockResolvedValue({
      data: [{ id: 10, nome: 'Atendimento Comercial' }]
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

    expect(screen.getByPlaceholderText('Digite Nome, E-mail ou Telefone *')).toBeInTheDocument();
  });
});
