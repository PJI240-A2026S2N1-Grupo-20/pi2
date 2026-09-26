import React, { useState, useRef, useEffect } from 'react';
import { getTaskTitle } from '../utils/kanbanUtils';
import { ChevronDown, ChevronUp, MoveRight, User, Calendar, FileText } from 'lucide-react';

export const TaskCard = ({
  task,
  isExpanded,
  onToggleExpand,
  onMoveTask,
  collections
}) => {
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const moveMenuRef = useRef(null);
  const title = getTaskTitle(task);

  // RF-12 & RNF-01: Focar com preventScroll: true para não sobrescrever a rolagem até o fim do menu
  useEffect(() => {
    if (showMoveMenu && moveMenuRef.current) {
      const timer = setTimeout(() => {
        if (moveMenuRef.current) {
          // 1. Dar foco na primeira opção impedindo a rolagem nativa do .focus()
          const firstOption = moveMenuRef.current.querySelector('button');
          if (firstOption) {
            firstOption.focus({ preventScroll: true });
          }
          // 2. Rolar o container até o final do menu para exibir todas as opções
          if (typeof moveMenuRef.current.scrollIntoView === 'function') {
            moveMenuRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
          }
        }
      }, 50);

      return () => clearTimeout(timer);
    }
  }, [showMoveMenu]);

  const handleDragStart = (e) => {
    e.dataTransfer.setData('text/plain', task.id);
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '6px',
        border: '1px solid #e5e7eb',
        borderLeft: '4px solid #3b82f6',
        padding: '0.875rem',
        marginBottom: '0.75rem',
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
        cursor: 'grab'
      }}
      aria-expanded={isExpanded}
    >
      {/* Cabeçalho do Cartão — Seleção Exclusiva */}
      <div
        onClick={onToggleExpand}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggleExpand();
          }
        }}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          cursor: 'pointer',
          gap: '0.5rem'
        }}
      >
        <h4 style={{ fontSize: '0.95rem', fontWeight: '600', color: '#1f2937', margin: 0 }}>
          {title}
        </h4>
        <button
          type="button"
          aria-label={isExpanded ? 'Recolher cartão' : 'Expandir cartão'}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}
        >
          {isExpanded ? <ChevronUp size={18} color="#6b7280" /> : <ChevronDown size={18} color="#6b7280" />}
        </button>
      </div>

      {/* Rótulo de Contato / Responsável Resumido */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', fontSize: '0.8rem', color: '#4b5563' }}>
        <User size={14} />
        <span>{task.responsavel_nome || 'Sem responsável'}</span>
      </div>

      {/* Visualização Detalhada do Cartão (RF-08) */}
      {isExpanded && (
        <div style={{ marginTop: '0.875rem', paddingTop: '0.75rem', borderTop: '1px dashed #e5e7eb', fontSize: '0.85rem' }}>
          {task.data_prevista && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#374151' }}>
              <Calendar size={14} color="#f59e0b" />
              <span><strong>Previsão:</strong> {task.data_prevista}</span>
            </div>
          )}

          {task.observacoes && (
            <div style={{ marginBottom: '0.75rem', color: '#4b5563' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: '500', marginBottom: '0.25rem' }}>
                <FileText size={14} />
                <span>Observações:</span>
              </div>
              <p style={{ margin: 0, paddingLeft: '1.25rem', whiteSpace: 'pre-line' }}>{task.observacoes}</p>
            </div>
          )}

          {/* Subtarefas */}
          {task.subtarefas && task.subtarefas.length > 0 && (
            <div style={{ marginBottom: '0.75rem' }}>
              <p style={{ fontWeight: '500', marginBottom: '0.35rem', color: '#374151' }}>Subtarefas:</p>
              <ul style={{ listStyle: 'none', paddingLeft: 0, margin: 0 }}>
                {task.subtarefas.map((sub) => (
                  <li key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', color: '#4b5563' }}>
                    <input type="checkbox" checked={sub.concluida} readOnly />
                    <span style={{ textDecoration: sub.concluida ? 'line-through' : 'none' }}>{sub.texto}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Menu Alternativo de Movimentação por Teclado (RF-12, RNF-01) */}
          <div style={{ marginTop: '1rem', position: 'relative' }}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowMoveMenu(!showMoveMenu);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                backgroundColor: '#f3f4f6',
                border: '1px solid #d1d5db',
                padding: '0.4rem 0.65rem',
                borderRadius: '4px',
                fontSize: '0.8rem',
                fontWeight: '500',
                color: '#374151',
                cursor: 'pointer'
              }}
              aria-haspopup="true"
              aria-expanded={showMoveMenu}
            >
              <MoveRight size={14} /> Mover para...
            </button>

            {showMoveMenu && (
              <div
                ref={moveMenuRef}
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: '0.25rem',
                  backgroundColor: '#ffffff',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                  zIndex: 10,
                  minWidth: '160px',
                  padding: '0.25rem 0'
                }}
              >
                {collections.map((col) => {
                  if (col.id === task.estado) return null;
                  return (
                    <button
                      key={col.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveTask(task.id, col.id);
                        setShowMoveMenu(false);
                      }}
                      style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        padding: '0.5rem 0.75rem',
                        backgroundColor: 'transparent',
                        border: 'none',
                        fontSize: '0.8rem',
                        color: '#1f2937',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                      {col.title}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
