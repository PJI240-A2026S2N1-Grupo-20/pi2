import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { KanbanBoard } from '../KanbanBoard';
import { getTaskTitle } from '../../utils/kanbanUtils';

describe('Quadro Kanban - Testes da Etapa 2 (v0.2.0)', () => {
  beforeEach(() => {
    localStorage.clear();
    // Restaurar viewport padrão Desktop (1024px) antes de cada teste
    global.innerWidth = 1024;
    window.dispatchEvent(new Event('resize'));
  });

  test('RF-10: Geração automática de título', () => {
    const taskComFluxoEContato = { fluxo_nome: 'Orçamento', contato_nome: 'João' };
    const taskApenasContato = { fluxo_nome: null, contato_nome: 'Maria' };
    const taskSemFluxoEContato = { fluxo_nome: null, contato_nome: null };

    expect(getTaskTitle(taskComFluxoEContato)).toBe('Orçamento · João');
    expect(getTaskTitle(taskApenasContato)).toBe('Tarefa · Maria');
    expect(getTaskTitle(taskSemFluxoEContato)).toBe('Tarefa');
  });

  test('RF-09: Seleção exclusiva de cartões (expandir um fecha o outro)', () => {
    render(<KanbanBoard />);

    // Localizar dois cabeçalhos de cartão
    const card1 = screen.getByText('Orçamento · João da Silva');
    const card2 = screen.getByText('Atendimento Comercial · EletroInstalações Prudente');

    // Clicar no primeiro cartão para expandir
    fireEvent.click(card1);
    expect(screen.getByText(/Cliente solicitou cotação de cabos/i)).toBeInTheDocument();

    // Clicar no segundo cartão
    fireEvent.click(card2);
    expect(screen.getByText(/Enviar catálogo de luminárias/i)).toBeInTheDocument();

    // O primeiro cartão deve ter sido recolhido automaticamente
    expect(screen.queryByText(/Cliente solicitou cotação de cabos/i)).not.toBeInTheDocument();
  });

  test('RF-11: Persistência da coleção ativa no LocalStorage', () => {
    // Definir viewport mobile
    global.innerWidth = 500;
    fireEvent(window, new Event('resize'));

    render(<KanbanBoard />);

    // Clicar na aba "Em andamento"
    const emAndamentoTab = screen.getByRole('button', { name: /Em andamento/i });
    fireEvent.click(emAndamentoTab);

    // Verificar se o localStorage foi atualizado
    expect(localStorage.getItem('eletrokanban_active_collection')).toBe('em_andamento');
  });

  test('RF-12: Acessibilidade e movimentação por botão sem drag & drop', () => {
    render(<KanbanBoard />);

    // Expandir primeiro cartão
    const card1 = screen.getByText('Orçamento · João da Silva');
    fireEvent.click(card1);

    // Abrir o menu "Mover para..."
    const moveButton = screen.getByRole('button', { name: /Mover para\.\.\./i });
    fireEvent.click(moveButton);

    // Selecionar o destino "A fazer"
    const targetOption = screen.getByRole('button', { name: 'A fazer' });
    fireEvent.click(targetOption);

    // O cartão foi movido para a nova coleção no estado e continua visível no desktop
    expect(screen.getByText('Orçamento · João da Silva')).toBeInTheDocument();
  });
});
