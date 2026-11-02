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
            { id: 's0', texto: 'Preparar orçamento', tipo: 'livre', concluida: false, opcao_selecionada: null },
            { id: 's1', texto: 'Resultado [Concluída | Cancelada]', tipo: 'resultado', concluida: false, opcao_selecionada: null }
          ]
        }
      ]
    });
  });

  test('RF-10: Geração automática de título', () => {
    expect(getTaskTitle({ fluxo_nome: 'Orçamento', contato_nome: 'João' })).toBe('Orçamento - João');
    expect(getTaskTitle({ fluxo_nome: null, contato_nome: 'Maria' })).toBe('Tarefa - Maria');
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
      expect(screen.getByText('Orçamento - João da Silva')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Orçamento - João da Silva'));

    const moveButton = screen.getByRole('button', { name: /Mover para\.\.\./i });
    fireEvent.click(moveButton);

    const targetOption = screen.getByRole('menuitem', { name: 'A fazer' });
    fireEvent.click(targetOption);

    expect(kanbanApi.updateTask).toHaveBeenCalledWith('1', { estado: 'a_fazer' });
  });

  test('RF-12: menu "Mover para..." fecha com Escape', async () => {
    render(<KanbanBoard />);

    await waitFor(() => {
      expect(screen.getByText('Orçamento - João da Silva')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Orçamento - João da Silva'));

    const moveButton = screen.getByRole('button', { name: /Mover para\.\.\./i });
    fireEvent.click(moveButton);

    await waitFor(() => {
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  test('RF-16: clicar no texto da subtarefa alterna o checkbox (label nativo)', async () => {
    kanbanApi.updateSubtarefa.mockResolvedValue({ data: {} });

    render(<KanbanBoard />);

    await waitFor(() => {
      expect(screen.getByText('Orçamento - João da Silva')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Orçamento - João da Silva'));

    const textoSub = await screen.findByText('Preparar orçamento');
    const label = textoSub.closest('label');
    expect(label).not.toBeNull();

    // Clicar no label (que envolve o texto) deve disparar o checkbox
    fireEvent.click(label);

    await waitFor(() => {
      expect(kanbanApi.updateSubtarefa).toHaveBeenCalledWith('s0', { concluida: true });
    });
  });

  test('RF-16: subtarefa de resultado não é envolvida em <label> (evita clique acidental no checkbox)', async () => {
    render(<KanbanBoard />);

    await waitFor(() => {
      expect(screen.getByText('Orçamento - João da Silva')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Orçamento - João da Silva'));

    const selectResultado = await screen.findByRole('combobox');
    // O select fica fora de um <label>, então o clique nele não alterna o checkbox
    expect(selectResultado.closest('label')).toBeNull();
  });
});
