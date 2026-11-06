import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import { TaskCard } from '../TaskCard';

const collections = [
  { id: 'pendencias', title: 'Pendências', color: '#6b7280' },
  { id: 'a_fazer', title: 'A fazer', color: '#f59e0b' },
  { id: 'em_andamento', title: 'Em andamento', color: '#3b82f6' },
  { id: 'concluido', title: 'Concluído', color: '#10b981' },
];

const tarefaComOpcoes = {
  id: 1,
  fluxo_nome: 'Fluxo com opções',
  contato_nome: 'Cliente RF23',
  estado: 'a_fazer',
  data_prevista: '2026-12-01',
  observacoes: '',
  responsavel_nome: 'Carlos',
  anexos: [],
  subtarefas: [
    {
      id: 's1',
      texto: 'Confirmar pagamento',
      tipo: 'fluxo',
      opcoes: ['Dinheiro', 'PIX', 'Cartão'],
      opcao_selecionada: null,
      concluida: false,
      ordem: 1,
    },
    {
      id: 's2',
      texto: 'Resultado [Concluída | Cancelada]',
      tipo: 'resultado',
      opcoes: [],
      opcao_selecionada: null,
      concluida: false,
      ordem: 999,
    },
  ],
  transicoes: [],
  auditorias: [],
};

const renderCard = (overrides = {}) => {
  const props = {
    task: tarefaComOpcoes,
    isExpanded: true,
    onToggleExpand: vi.fn(),
    onMoveTask: vi.fn(),
    onToggleSubtarefa: vi.fn(),
    onUpdateSubtarefaOption: vi.fn(),
    onAddSubtarefa: vi.fn(),
    onDeleteSubtarefa: vi.fn(),
    onReorderSubtarefa: vi.fn(),
    onEditTask: vi.fn(),
    onReopenTask: vi.fn(),
    collections,
    ...overrides,
  };
  return { props, ...render(<TaskCard {...props} />) };
};

describe('TaskCard - RF-23 (opções de passo de fluxo)', () => {
  test('renderiza select com as opções do passo para subtarefa tipo fluxo', () => {
    renderCard();

    const select = screen.getByRole('combobox', {
      name: /Selecionar opção para Confirmar pagamento/i,
    });
    expect(select).toBeInTheDocument();

    const labels = Array.from(select.options).map((o) => o.textContent);
    expect(labels).toEqual(['[Selecione]', 'Dinheiro', 'PIX', 'Cartão']);
  });

  test('dispara onUpdateSubtarefaOption com os argumentos corretos ao escolher', () => {
    const { props } = renderCard();

    const select = screen.getByRole('combobox', {
      name: /Selecionar opção para Confirmar pagamento/i,
    });
    fireEvent.change(select, { target: { value: 'PIX' } });

    expect(props.onUpdateSubtarefaOption).toHaveBeenCalledTimes(1);
    expect(props.onUpdateSubtarefaOption).toHaveBeenCalledWith(
      1, 's1', 'PIX',
    );
  });

  test('reflete a opção selecionada quando vem do backend', () => {
    const tarefa = {
      ...tarefaComOpcoes,
      subtarefas: tarefaComOpcoes.subtarefas.map((s) =>
        s.id === 's1' ? { ...s, opcao_selecionada: 'Cartão' } : s
      ),
    };
    renderCard({ task: tarefa });

    const select = screen.getByRole('combobox', {
      name: /Selecionar opção para Confirmar pagamento/i,
    });
    expect(select.value).toBe('Cartão');
  });
});
