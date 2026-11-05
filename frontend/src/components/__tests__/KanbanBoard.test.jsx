import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
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
          ],
          transicoes: [
            {
              id: 't1', origem: 'pendencias', destino: 'a_fazer',
              usuario_nome: 'Carlos', justificativa: '',
              resultado_snapshot: '', data_hora: '2026-10-01T10:00:00Z',
            }
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
    expect(selectResultado.closest('label')).toBeNull();
  });

  // ---------------------------------------------------------------- v0.7.0
  test('v0.7.0: botão "..." abre menu com "Histórico de transições"', async () => {
    render(<KanbanBoard />);
    await waitFor(() => {
      expect(screen.getByText('Orçamento - João da Silva')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Orçamento - João da Silva'));

    const moreButton = screen.getByRole('button', { name: /Mais ações/i });
    fireEvent.click(moreButton);

    expect(screen.getByRole('menuitem', { name: /Histórico de transições/i })).toBeInTheDocument();
  });

  test('v0.7.0: histórico não aparece mais inline no cartão', async () => {
    render(<KanbanBoard />);
    await waitFor(() => {
      expect(screen.getByText('Orçamento - João da Silva')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Orçamento - João da Silva'));

    // O título do histórico só deve existir após abrir o menu + item
    expect(screen.queryByRole('dialog', { name: 'Histórico de Transições' })).not.toBeInTheDocument();
  });

  test('v0.7.0: clicar em "Histórico de transições" abre modal com as entradas', async () => {
    render(<KanbanBoard />);
    await waitFor(() => {
      expect(screen.getByText('Orçamento - João da Silva')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Orçamento - João da Silva'));

    fireEvent.click(screen.getByRole('button', { name: /Mais ações/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Histórico de transições/i }));

    const dialog = screen.getByRole('dialog', { name: 'Histórico de Transições' });
    expect(dialog).toBeInTheDocument();

    // Escopa as buscas dentro do modal — "Pendências" e "A fazer" também
    // aparecem como títulos de coluna do quadro.
    const modal = within(dialog);
    expect(modal.getByText('Pendências')).toBeInTheDocument();
    expect(modal.getByText('A fazer')).toBeInTheDocument();
    expect(modal.getByText(/Carlos/)).toBeInTheDocument();
  });

  test('v0.7.0: mover para a_fazer sem data abre popup "Definir Data Prevista"', async () => {
    kanbanApi.getTarefas.mockResolvedValueOnce({
      data: [
        {
          id: '9',
          fluxo_nome: 'Orçamento',
          contato_nome: 'Sem Data',
          estado: 'pendencias',
          data_prevista: null,
          observacoes: '',
          responsavel_nome: 'Carlos Vendedor',
          subtarefas: [{ id: 's9', texto: 'Resultado', tipo: 'resultado', concluida: false, opcao_selecionada: null }],
          transicoes: [],
        }
      ]
    });

    render(<KanbanBoard />);
    await waitFor(() => {
      expect(screen.getByText('Orçamento - Sem Data')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Orçamento - Sem Data'));

    fireEvent.click(screen.getByRole('button', { name: /Mover para\.\.\./i }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'A fazer' }));

    expect(screen.getByText(/necessário definir uma Data Prevista/i)).toBeInTheDocument();
    expect(kanbanApi.updateTask).not.toHaveBeenCalled();
  });
});
