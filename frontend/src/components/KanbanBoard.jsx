import React, { useState, useEffect } from 'react';
import { KanbanColumn } from './KanbanColumn';
import { INITIAL_TASKS } from '../utils/kanbanUtils';

const COLLECTIONS = [
  { id: 'pendencias', title: 'Pendências', color: '#6b7280' },
  { id: 'a_fazer', title: 'A fazer', color: '#3b82f6' },
  { id: 'em_andamento', title: 'Em andamento', color: '#f59e0b' },
  { id: 'concluido', title: 'Concluído', color: '#10b981' }
];

export const KanbanBoard = () => {
  const [tasks, setTasks] = useState(INITIAL_TASKS);
  
  // RF-11: Persistência no LocalStorage
  const [activeCollection, setActiveCollection] = useState(() => {
    return localStorage.getItem('eletrokanban_active_collection') || 'pendencias';
  });

  const [expandedTaskId, setExpandedTaskId] = useState(() => {
    return localStorage.getItem('eletrokanban_expanded_task') || null;
  });

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    localStorage.setItem('eletrokanban_active_collection', activeCollection);
  }, [activeCollection]);

  useEffect(() => {
    if (expandedTaskId) {
      localStorage.setItem('eletrokanban_expanded_task', expandedTaskId);
    } else {
      localStorage.removeItem('eletrokanban_expanded_task');
    }
  }, [expandedTaskId]);

  // RF-09: Seleção Exclusiva de Cartões
  const handleToggleExpandTask = (taskId) => {
    setExpandedTaskId((prevId) => (prevId === taskId ? null : taskId));
  };

  const handleMoveTask = (taskId, targetCollectionId) => {
    setTasks((prevTasks) =>
      prevTasks.map((t) => (t.id === taskId ? { ...t, estado: targetCollectionId } : t))
    );
  };

  return (
    <div style={{ width: '100%' }}>
      {/* Visualização Adaptável para Dispositivos Móveis (RF-06, RNF-02) */}
      {isMobile ? (
        <div>
          {/* Seletor de Coleção Ativa em Faixas/Abas */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '0.25rem',
            marginBottom: '1rem',
            backgroundColor: '#e5e7eb',
            padding: '0.25rem',
            borderRadius: '8px'
          }}>
            {COLLECTIONS.map((col) => {
              const count = tasks.filter((t) => t.estado === col.id).length;
              const isActive = activeCollection === col.id;
              return (
                <button
                  key={col.id}
                  onClick={() => setActiveCollection(col.id)}
                  style={{
                    padding: '0.5rem 0.25rem',
                    backgroundColor: isActive ? '#ffffff' : 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: isActive ? 'bold' : 'normal',
                    color: isActive ? '#111827' : '#4b5563',
                    cursor: 'pointer',
                    boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.15rem'
                  }}
                >
                  <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: col.color
                  }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                    {col.title}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>({count})</span>
                </button>
              );
            })}
          </div>

          {/* Exibição Única da Coleção Selecionada no Mobile */}
          <div>
            {COLLECTIONS.filter((col) => col.id === activeCollection).map((col) => (
              <KanbanColumn
                key={col.id}
                collection={col}
                tasks={tasks.filter((t) => t.estado === col.id)}
                expandedTaskId={expandedTaskId}
                onToggleExpandTask={handleToggleExpandTask}
                onMoveTask={handleMoveTask}
                collections={COLLECTIONS}
              />
            ))}
          </div>
        </div>
      ) : (
        /* Visualização Ampla para Desktop — 4 Colunas Lado a Lado (RF-06) */
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '1rem',
          alignItems: 'start'
        }}>
          {COLLECTIONS.map((col) => (
            <KanbanColumn
              key={col.id}
              collection={col}
              tasks={tasks.filter((t) => t.estado === col.id)}
              expandedTaskId={expandedTaskId}
              onToggleExpandTask={handleToggleExpandTask}
              onMoveTask={handleMoveTask}
              collections={COLLECTIONS}
            />
          ))}
        </div>
      )}
    </div>
  );
};
