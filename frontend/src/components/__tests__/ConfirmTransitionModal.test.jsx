import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmTransitionModal } from '../ConfirmTransitionModal';
import { vi } from 'vitest';

describe('ConfirmTransitionModal - Transições Seguras (v0.7.0)', () => {
  test('variante concluir exige selecionar resultado', () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmTransitionModal
        transition={{
          type: 'concluir',
          task: {
            id: 1,
            estado: 'a_fazer',
            fluxo_nome: 'Orçamento',
            contato_nome: 'João',
            subtarefas: [{ id: 's1', tipo: 'resultado', opcao_selecionada: null }],
          },
          destino: 'concluido',
        }}
        onCancel={vi.fn()}
        onConfirm={onConfirm}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Confirmar/i }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByText(/Selecione uma opção de resultado/i)).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText(/concluída/i));
    fireEvent.click(screen.getByRole('button', { name: /Confirmar/i }));
    expect(onConfirm).toHaveBeenCalledWith({ resultado: 'Concluída' });
  });

  test('variante voltar_pendencias alerta sobre remoção da data', () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmTransitionModal
        transition={{
          type: 'voltar_pendencias',
          task: { id: 1, estado: 'a_fazer', fluxo_nome: 'Orçamento', contato_nome: 'João' },
          destino: 'pendencias',
        }}
        onCancel={vi.fn()}
        onConfirm={onConfirm}
      />
    );
    expect(screen.getByText(/Data Prevista será removida/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Confirmar/i }));
    expect(onConfirm).toHaveBeenCalledWith({});
  });

  test('variante reabrir exige justificativa', () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmTransitionModal
        transition={{
          type: 'reabrir',
          task: { id: 1, estado: 'concluido', data_prevista: '2026-10-01' },
        }}
        onCancel={vi.fn()}
        onConfirm={onConfirm}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Confirmar/i }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByText(/justificativa é obrigatória/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/justificativa/i), { target: { value: 'Revisão' } });
    fireEvent.click(screen.getByRole('button', { name: /Confirmar/i }));

    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        destino: 'a_fazer',
        data_prevista: '2026-10-01',
        justificativa: 'Revisão',
      })
    );
  });

  test('variante reabrir permite trocar destino', () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmTransitionModal
        transition={{
          type: 'reabrir',
          task: { id: 1, estado: 'concluido', data_prevista: '2026-10-01' },
        }}
        onCancel={vi.fn()}
        onConfirm={onConfirm}
      />
    );

    fireEvent.change(screen.getByLabelText(/destino/i), { target: { value: 'em_andamento' } });
    fireEvent.change(screen.getByLabelText(/justificativa/i), { target: { value: 'Retomada' } });
    fireEvent.click(screen.getByRole('button', { name: /Confirmar/i }));

    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ destino: 'em_andamento', justificativa: 'Retomada' })
    );
  });

  test('variante definir_data exige data prevista', () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmTransitionModal
        transition={{
          type: 'definir_data',
          task: { id: 1, estado: 'pendencias', fluxo_nome: 'Orçamento', contato_nome: 'João', data_prevista: null },
          destino: 'a_fazer',
        }}
        onCancel={vi.fn()}
        onConfirm={onConfirm}
      />
    );

    expect(screen.getByText(/necessário definir uma Data Prevista/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Confirmar/i }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByText(/Informe uma Data Prevista para continuar/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Data Prevista/i), { target: { value: '2026-10-05' } });
    fireEvent.click(screen.getByRole('button', { name: /Confirmar/i }));
    expect(onConfirm).toHaveBeenCalledWith({ data_prevista: '2026-10-05' });
  });
});
