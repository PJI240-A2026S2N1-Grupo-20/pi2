import React from 'react';
import { Search, X } from 'lucide-react';

export const FilterBar = ({
  filters,
  onChange,
  onClear,
  fluxos = [],
  usuarios = [],
}) => {
  const hasActiveFilters =
    (filters.search && filters.search.trim()) ||
    filters.fluxo ||
    filters.responsavel ||
    filters.situacao;

  const update = (patch) => onChange({ ...filters, ...patch });

  const baseControl = {
    padding: '0.45rem 0.6rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '0.85rem',
    backgroundColor: '#ffffff',
    color: '#111827',
    minWidth: 0,
  };

  return (
    <div
      role="region"
      aria-label="Filtros do quadro"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.5rem',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        padding: '0.65rem 0.75rem',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
        marginBottom: '1rem',
      }}
    >
      <div style={{ position: 'relative', flex: '1 1 220px', minWidth: '180px' }}>
        <Search
          size={14}
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: '0.5rem',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#9ca3af',
          }}
        />
        <input
          type="search"
          aria-label="Buscar tarefas"
          placeholder="Buscar por titulo, contato ou observacao..."
          value={filters.search || ''}
          onChange={(e) => update({ search: e.target.value })}
          style={{ ...baseControl, width: '100%', paddingLeft: '1.75rem' }}
        />
      </div>

      <select
        aria-label="Filtrar por fluxo"
        value={filters.fluxo || ''}
        onChange={(e) => update({ fluxo: e.target.value })}
        style={baseControl}
      >
        <option value="">Todos os fluxos</option>
        {fluxos.map((f) => (
          <option key={f.id} value={f.id}>
            {f.nome}
          </option>
        ))}
      </select>

      <select
        aria-label="Filtrar por responsavel"
        value={filters.responsavel || ''}
        onChange={(e) => update({ responsavel: e.target.value })}
        style={baseControl}
      >
        <option value="">Todos os responsaveis</option>
        {usuarios.map((u) => (
          <option key={u.id} value={u.id}>
            {u.username}
          </option>
        ))}
      </select>

      <select
        aria-label="Filtrar por situacao de prazo"
        value={filters.situacao || ''}
        onChange={(e) => update({ situacao: e.target.value })}
        style={baseControl}
      >
        <option value="">Todas as situacoes</option>
        <option value="atrasadas">Em atraso</option>
        <option value="alerta">Em alerta (L1/L2)</option>
        <option value="normais">Dentro do prazo</option>
      </select>

      {hasActiveFilters && (
        <button
          type="button"
          onClick={onClear}
          aria-label="Limpar filtros"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            padding: '0.45rem 0.7rem',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            background: '#f3f4f6',
            color: '#4b5563',
            fontSize: '0.8rem',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          <X size={14} /> Limpar filtros
        </button>
      )}
    </div>
  );
};
