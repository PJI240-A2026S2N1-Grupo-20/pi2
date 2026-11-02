import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { KanbanBoard } from '../KanbanBoard';
import { getTaskTitle } from '../../utils/kanbanUtils';
import * as kanbanApi from '../../api/kanbanApi';
import { vi } from 'vitest';

vi.mock('../../api/kanbanApi');

describe('Quadro Kanban - Testes da Etapa 3 (v0.4.x)', () => {
  beforeEach(() => {
    localStorage.clear();
    global.innerWidth = 1024;
    window.dispatchEvent(new Event('resize'));
    vi.clearAllMocks();

    kanbanApi.getTarefas.mockResolvedValue({
      data: [
        {
          id: '1',
          fluxo_nome: 'Orçamento',
          contato_nome: 'João da Silva',
          estado: 'pendencias',
          data_prevista: '2026-09-30',
          observacoes: 'Cliente solicitou cotação de cabos',
          responsavel_nome: 'Carlos Vendedor',
          subtarefas: [
            { id: 's1', texto: 'Resultado [Concluída | Cancelada]', tipo: 'resultado', concluida: false, opcao_selecionada: null }
          ]
        }
      ]
    });
  });

  test('RF-10: Geração automática de título', () => {
    expect(getTaskTitle({ fluxo_nome: 'Orçamento', contato_nome: 'João' })).toBe('Orçamento · João');
    expect(getTaskTitle({ fluxo_nome: null, contato_nome: 'Maria' })).toBe('Tarefa · Maria');
    expect(getTaskTitle({ fluxo_nome: null, contato_nome: null })).toBe('Tarefa');
  });

  test('RF-10: sem contato retorna "Tarefa" mesmo com fluxo definido', () => {
    expect(getTaskTitle({ fluxo_nome: 'Orçamento', contato_nome: null })).toBe('Tarefa');
    expect(getTaskTitle({ fluxo_nome: 'Orçamento', contato_nome: '' })).toBe('Tarefa');
    expect(getTaskTitle({ fluxo_nome: 'Orçamento', contato_nome: '   ' })).toBe('Tarefa');
  });

  test('RF-16 / RF-12: Alternar checkbox de subtarefas e mover tarefa', async () => {
    kanbanApi.updateTask.mockResolvedValue({ data: { id: '1', estado: 'a_fazer' } });

    render(<KanbanBoard />);

    await waitFor(() => {
      expect(screen.getByText('Orçamento · João da Silva')).toBeInTheDocument();
    });

    const card = screen.getByText('Orçamento · João da Silva');
    fireEvent.click(card);

    const moveButton = screen.getByRole('button', { name: /Mover para\.\.\./i });
    fireEvent.click(moveButton);

    const targetOption = screen.getByRole('button', { name: 'A fazer' });
    fireEvent.click(targetOption);

    expect(kanbanApi.updateTask).toHaveBeenCalledWith('1', { estado: 'a_fazer' });
  });
});
