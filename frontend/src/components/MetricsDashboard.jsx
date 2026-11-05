import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Download,
  TrendingUp,
} from 'lucide-react';
import * as kanbanApi from '../api/kanbanApi';
import { ESTADO_LABEL } from '../utils/kanbanUtils';

const PERIODOS = [
  { id: '7', label: 'Últimos 7 dias', dias: 7 },
  { id: '30', label: 'Últimos 30 dias', dias: 30 },
  { id: '90', label: 'Últimos 90 dias', dias: 90 },
  { id: 'all', label: 'Todo o período', dias: null },
];

const calcularPeriodo = (id) => {
  if (id === 'all') return {};
  const dias = parseInt(id, 10);
  const hoje = new Date();
  const inicio = new Date();
  inicio.setDate(hoje.getDate() - dias);
  return {
    data_inicio: inicio.toISOString().split('T')[0],
    data_fim: hoje.toISOString().split('T')[0],
  };
};

const cardStyle = {
  backgroundColor: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '1rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem',
};

const cardTitleStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.35rem',
  fontSize: '0.8rem',
  fontWeight: '600',
  color: '#4b5563',
};

const cardValueStyle = {
  fontSize: '1.75rem',
  fontWeight: 'bold',
  color: '#111827',
};

export const MetricsDashboard = () => {
  const [periodo, setPeriodo] = useState('30');
  const [metricas, setMetricas] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [exportando, setExportando] = useState('');

  useEffect(() => {
    let ativo = true;
    const carregar = async () => {
      setLoading(true);
      setErro('');
      try {
        const res = await kanbanApi.getMetricas(calcularPeriodo(periodo));
        if (ativo) setMetricas(res.data);
      } catch (err) {
        if (ativo) setErro('Não foi possível carregar as métricas. Tente novamente.');
      } finally {
        if (ativo) setLoading(false);
      }
    };
    carregar();
    return () => {
      ativo = false;
    };
  }, [periodo]);

  const baixarCsv = async (tipo) => {
    setExportando(tipo);
    setErro('');
    try {
      const params = calcularPeriodo(periodo);
      const res = tipo === 'tarefas'
        ? await kanbanApi.exportarTarefas(params)
        : await kanbanApi.exportarTransicoes(params);

      const url = window.URL.createObjectURL(
        new Blob([res.data], { type: 'text/csv;charset=utf-8' })
      );
      const link = document.createElement('a');
      const dataArquivo = new Date().toISOString().split('T')[0];
      link.href = url;
      link.setAttribute('download', `${tipo}_${dataArquivo}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setErro('Não foi possível exportar o arquivo. Tente novamente.');
    } finally {
      setExportando('');
    }
  };

  const botaoExportarStyle = (ativo) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.35rem',
    padding: '0.45rem 0.8rem',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    backgroundColor: ativo ? '#f3f4f6' : '#ffffff',
    color: '#374151',
    fontSize: '0.8rem',
    fontWeight: '600',
    cursor: ativo ? 'not-allowed' : 'pointer',
    opacity: ativo ? 0.6 : 1,
  });

  return (
    <section aria-labelledby="metricas-titulo">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
          marginBottom: '1rem',
        }}
      >
        <div role="group" aria-label="Filtro de período" style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
          {PERIODOS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPeriodo(p.id)}
              aria-pressed={periodo === p.id}
              style={{
                padding: '0.4rem 0.8rem',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                backgroundColor: periodo === p.id ? '#2563eb' : '#ffffff',
                color: periodo === p.id ? '#ffffff' : '#374151',
                fontSize: '0.8rem',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => baixarCsv('tarefas')}
            disabled={exportando === 'tarefas'}
            aria-label="Exportar tarefas em CSV"
            style={botaoExportarStyle(exportando === 'tarefas')}
          >
            <Download size={14} /> Exportar tarefas (CSV)
          </button>
          <button
            type="button"
            onClick={() => baixarCsv('transicoes')}
            disabled={exportando === 'transicoes'}
            aria-label="Exportar transições em CSV"
            style={botaoExportarStyle(exportando === 'transicoes')}
          >
            <Download size={14} /> Exportar transições (CSV)
          </button>
        </div>
      </div>

      {erro && (
        <div
          role="alert"
          style={{
            padding: '0.75rem',
            backgroundColor: '#fee2e2',
            color: '#991b1b',
            borderRadius: '6px',
            marginBottom: '1rem',
            fontSize: '0.85rem',
          }}
        >
          {erro}
        </div>
      )}

      {loading ? (
        <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>Carregando métricas...</p>
      ) : metricas ? (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '0.75rem',
              marginBottom: '1rem',
            }}
          >
            <div data-testid="metric-total" style={cardStyle}>
              <span style={cardTitleStyle}>
                <BarChart3 size={16} color="#2563eb" /> Total de tarefas
              </span>
              <span style={cardValueStyle}>{metricas.total}</span>
            </div>

            <div data-testid="metric-atrasadas" style={cardStyle}>
              <span style={cardTitleStyle}>
                <AlertTriangle size={16} color="#ea580c" /> Atrasadas
              </span>
              <span style={cardValueStyle}>{metricas.atrasadas}</span>
            </div>

            <div data-testid="metric-taxa" style={cardStyle}>
              <span style={cardTitleStyle}>
                <TrendingUp size={16} color="#10b981" /> Taxa de conclusão
              </span>
              <span style={cardValueStyle}>{metricas.taxa_conclusao.toFixed(2)}%</span>
            </div>

            <div data-testid="metric-tempo" style={cardStyle}>
              <span style={cardTitleStyle}>
                <Clock size={16} color="#7c3aed" /> Tempo médio de ciclo
              </span>
              <span style={cardValueStyle}>{metricas.tempo_medio_ciclo_dias} dias</span>
            </div>
          </div>

          <div style={{ ...cardStyle, marginBottom: '1rem' }}>
            <h3 id="metricas-titulo" style={{ fontSize: '0.95rem', margin: 0, marginBottom: '0.5rem', color: '#111827' }}>
              Distribuição por coleção
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.35rem' }}>
              {Object.entries(metricas.totais_por_estado).map(([estado, qtd]) => (
                <li
                  key={estado}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.85rem',
                    color: '#374151',
                    padding: '0.35rem 0.5rem',
                    backgroundColor: '#f9fafb',
                    borderRadius: '4px',
                  }}
                >
                  <span>{ESTADO_LABEL[estado] || estado}</span>
                  <strong>{qtd}</strong>
                </li>
              ))}
            </ul>
          </div>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.8rem', color: '#4b5563' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <CheckCircle size={14} color="#10b981" /> Concluídas: {metricas.concluidas}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <XCircle size={14} color="#ef4444" /> Canceladas: {metricas.canceladas}
            </span>
          </div>
        </>
      ) : null}
    </section>
  );
};
