import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MetricsDashboard } from '../MetricsDashboard';
import * as kanbanApi from '../../api/kanbanApi';
import { vi } from 'vitest';

vi.mock('../../api/kanbanApi');

const metricasMock = {
  periodo: { data_inicio: '2026-09-01', data_fim: '2026-10-01' },
  totais_por_estado: {
    pendencias: 2,
    a_fazer: 1,
    em_andamento: 1,
    concluido: 3,
  },
  total: 7,
  concluidas: 2,
  canceladas: 1,
  taxa_conclusao: 66.67,
  tempo_medio_ciclo_dias: 2.5,
  atrasadas: 1,
};

describe('MetricsDashboard - RF-31 e RF-32', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    kanbanApi.getMetricas.mockResolvedValue({ data: metricasMock });
    kanbanApi.exportarTarefas.mockResolvedValue({
      data: new Blob(['id;titulo\n1;teste'], { type: 'text/csv' }),
    });
    kanbanApi.exportarTransicoes.mockResolvedValue({
      data: new Blob(['id;tarefa_id\n1;1'], { type: 'text/csv' }),
    });
    global.URL.createObjectURL = vi.fn(() => 'blob:mock');
    global.URL.revokeObjectURL = vi.fn();
  });

  test('exibe os cartões de métricas após carregar', async () => {
    render(<MetricsDashboard />);
    await waitFor(() => {
      expect(screen.getByTestId('metric-total')).toHaveTextContent('7');
      expect(screen.getByTestId('metric-atrasadas')).toHaveTextContent('1');
      expect(screen.getByTestId('metric-taxa')).toHaveTextContent('66.67%');
      expect(screen.getByTestId('metric-tempo')).toHaveTextContent('2.5 dias');
    });
  });

  test('exibe a distribuição por coleção', async () => {
    render(<MetricsDashboard />);
    await waitFor(() => {
      expect(screen.getByText('Pendências')).toBeInTheDocument();
      expect(screen.getByText('Concluído')).toBeInTheDocument();
    });
  });

  test('trocar de período dispara nova requisição', async () => {
    render(<MetricsDashboard />);
    await waitFor(() => expect(kanbanApi.getMetricas).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('button', { name: /Últimos 7 dias/i }));
    await waitFor(() => expect(kanbanApi.getMetricas).toHaveBeenCalledTimes(2));
  });

  test('botão de exportar tarefas aciona a API', async () => {
    render(<MetricsDashboard />);
    await waitFor(() => expect(kanbanApi.getMetricas).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: /Exportar tarefas em CSV/i }));
    await waitFor(() => expect(kanbanApi.exportarTarefas).toHaveBeenCalled());
  });

  test('botão de exportar transições aciona a API', async () => {
    render(<MetricsDashboard />);
    await waitFor(() => expect(kanbanApi.getMetricas).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: /Exportar transições em CSV/i }));
    await waitFor(() => expect(kanbanApi.exportarTransicoes).toHaveBeenCalled());
  });

  test('exibe mensagem de erro quando a carga falha', async () => {
    kanbanApi.getMetricas.mockRejectedValueOnce(new Error('falha'));
    render(<MetricsDashboard />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/não foi possível carregar/i);
    });
  });
});
