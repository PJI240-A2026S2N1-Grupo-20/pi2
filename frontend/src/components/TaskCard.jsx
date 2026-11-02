import React, { useState, useRef, useEffect } from 'react';
import { getTaskTitle, formatDateBR } from '../utils/kanbanUtils';
import { ChevronDown, ChevronUp, MoveRight, User, Calendar, FileText, Plus, MoreHorizontal, Check, X, Edit2 } from 'lucide-react';

export const TaskCard = ({
  task,
  isExpanded,
  onToggleExpand,
  onMoveTask,
  onToggleSubtarefa,
  onUpdateSubtarefaOption,
  onAddSubtarefa,
  onDeleteSubtarefa,
  onReorderSubtarefa,
  onEditTask,
  collections
}) => {
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const [activeMenuSubId, setActiveMenuSubId] = useState(null);
  const [insertingForSubId, setInsertingForSubId] = useState(null);
  const [insertPosition, setInsertPosition] = useState('below');
  const [newSubText, setNewSubText] = useState('');

  const moveMenuRef = useRef(null);
  const moveButtonRef = useRef(null);
  const title = getTaskTitle(task);

  useEffect(() => {
    if (showMoveMenu && moveMenuRef.current) {
      const timer = setTimeout(() => {
        if (moveMenuRef.current) {
          const firstOption = moveMenuRef.current.querySelector('button');
          if (firstOption) {
            firstOption.focus({ preventScroll: true });
          }
          if (typeof moveMenuRef.current.scrollIntoView === 'function') {
            moveMenuRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
          }
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [showMoveMenu]);

  useEffect(() => {
    if (!showMoveMenu && activeMenuSubId === null) return;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (showMoveMenu) {
        setShowMoveMenu(false);
        moveButtonRef.current?.focus();
      }
      if (activeMenuSubId !== null) {
        setActiveMenuSubId(null);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showMoveMenu, activeMenuSubId]);

  const handleMoveMenuKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      setShowMoveMenu(false);
      moveButtonRef.current?.focus();
      return;
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!moveMenuRef.current) return;
      const buttons = Array.from(moveMenuRef.current.querySelectorAll('button'));
      if (buttons.length === 0) return;
      e.preventDefault();
      const currentIdx = buttons.indexOf(document.activeElement);
      let nextIdx;
      if (e.key === 'ArrowDown') {
        nextIdx = currentIdx < buttons.length - 1 ? currentIdx + 1 : 0;
      } else {
        nextIdx = currentIdx > 0 ? currentIdx - 1 : buttons.length - 1;
      }
      buttons[nextIdx]?.focus();
    }
  };

  const handleDragStart = (e) => {
    e.dataTransfer.setData('text/plain', task.id);
  };

  const handleOpenInsert = (subId, position) => {
    setInsertingForSubId(subId);
    setInsertPosition(position);
    setNewSubText('');
    setActiveMenuSubId(null);
  };

  const handleConfirmInsert = () => {
    if (!newSubText.trim()) return;
    onAddSubtarefa(task.id, newSubText.trim(), insertingForSubId, insertPosition);
    setInsertingForSubId(null);
    setNewSubText('');
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

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', fontSize: '0.8rem', color: '#4b5563' }}>
        <User size={14} />
        <span>{task.responsavel_nome || 'Sem responsável'}</span>
      </div>

      {isExpanded && (
        <div style={{ marginTop: '0.875rem', paddingTop: '0.75rem', borderTop: '1px dashed #e5e7eb', fontSize: '0.85rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            {task.data_prevista ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#374151' }}>
                <Calendar size={14} color="#f59e0b" />
                <span><strong>Previsão:</strong> {formatDateBR(task.data_prevista)}</span>
              </div>
            ) : (
              <span style={{ fontSize: '0.8rem', color: '#9ca3af', fontStyle: 'italic' }}>Sem data prevista</span>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEditTask(task);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                border: '1px solid #bfdbfe',
                borderRadius: '4px',
                padding: '0.2rem 0.5rem',
                fontSize: '0.75rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              <Edit2 size={12} /> Editar
            </button>
          </div>

          {task.observacoes && (
            <div style={{ marginBottom: '0.75rem', color: '#4b5563' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: '500', marginBottom: '0.25rem' }}>
                <FileText size={14} />
                <span>Observações:</span>
              </div>
              <p style={{ margin: 0, paddingLeft: '1.25rem', whiteSpace: 'pre-line' }}>{task.observacoes}</p>
            </div>
          )}

          <div style={{ marginBottom: '0.75rem' }}>
            <p style={{ fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>Subtarefas:</p>
            <ul style={{ listStyle: 'none', paddingLeft: 0, margin: 0 }}>
              {task.subtarefas?.map((sub, index) => {
                const isInsertingAbove = insertingForSubId === sub.id && insertPosition === 'above';
                const isInsertingBelow = insertingForSubId === sub.id && insertPosition === 'below';
                const isFirst = index === 0;
                const isLast = index === (task.subtarefas.length - 1);

                return (
                  <React.Fragment key={sub.id}>
                    {isInsertingAbove && (
                      <li style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.35rem', paddingLeft: '0.5rem' }}>
                        <input
                          type="text"
                          autoFocus
                          placeholder="Texto da nova subtarefa..."
                          value={newSubText}
                          onChange={(e) => setNewSubText(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleConfirmInsert()}
                          style={{ flex: 1, padding: '0.25rem 0.5rem', border: '1px solid #3b82f6', borderRadius: '4px', fontSize: '0.8rem' }}
                        />
                        <button type="button" onClick={handleConfirmInsert} style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', padding: '0.25rem 0.5rem', cursor: 'pointer' }}><Check size={14} /></button>
                        <button type="button" onClick={() => setInsertingForSubId(null)} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', padding: '0.25rem 0.5rem', cursor: 'pointer' }}><X size={14} /></button>
                      </li>
                    )}

                    <li style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.25rem 0', borderBottom: '1px solid #f3f4f6', position: 'relative' }}>
                      {sub.tipo === 'resultado' ? (
                        // Tipo resultado: mantém <div>; o <select> é o alvo de clique,
                        // então envolvê-lo em <label> dispararia o checkbox indevidamente.
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, marginRight: '0.5rem' }}>
                          <input
                            type="checkbox"
                            checked={sub.concluida || sub.opcao_selecionada === 'Concluída'}
                            onChange={() => onToggleSubtarefa(task.id, sub.id, sub.concluida)}
                            style={{ cursor: 'pointer' }}
                          />
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                            <span style={{ fontWeight: '500', color: '#1f2937' }}>Resultado:</span>
                            <select
                              value={sub.opcao_selecionada || ''}
                              onChange={(e) => onUpdateSubtarefaOption(task.id, sub.id, e.target.value)}
                              style={{ padding: '0.2rem 0.4rem', borderRadius: '4px', border: '1px solid #d1d5db', fontSize: '0.8rem', backgroundColor: '#fff' }}
                            >
                              <option value="">[Selecione]</option>
                              <option value="Concluída">Concluída</option>
                              <option value="Cancelada">Cancelada</option>
                            </select>
                          </div>
                        </div>
                      ) : (
                        // Tipo livre/fluxo: <label> nativo associa clique no texto ao checkbox.
                        // Cobre clique do mouse, toque em mobile e leitores de tela (RNF-01).
                        <label
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            flex: 1,
                            marginRight: '0.5rem',
                            cursor: 'pointer'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={sub.concluida || sub.opcao_selecionada === 'Concluída'}
                            onChange={() => onToggleSubtarefa(task.id, sub.id, sub.concluida)}
                            style={{ cursor: 'pointer' }}
                          />
                          <span
                            style={{
                              textDecoration: sub.concluida ? 'line-through' : 'none',
                              color: sub.concluida ? '#9ca3af' : '#374151',
                              fontSize: '0.825rem'
                            }}
                          >
                            {sub.texto}
                          </span>
                        </label>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', position: 'relative' }}>
                        <button
                          type="button"
                          title="Adicionar subtarefa abaixo"
                          onClick={() => handleOpenInsert(sub.id, 'below')}
                          style={{ background: '#e0f2fe', color: '#0284c7', border: 'none', borderRadius: '4px', padding: '0.2rem 0.35rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        >
                          <Plus size={13} />
                        </button>

                        <button
                          type="button"
                          title="Opções da subtarefa"
                          onClick={() => setActiveMenuSubId(activeMenuSubId === sub.id ? null : sub.id)}
                          style={{ background: '#f3f4f6', color: '#4b5563', border: 'none', borderRadius: '4px', padding: '0.2rem 0.35rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        >
                          <MoreHorizontal size={13} />
                        </button>

                        {activeMenuSubId === sub.id && (
                          <div
                            style={{
                              position: 'absolute',
                              right: 0,
                              top: '100%',
                              backgroundColor: '#ffffff',
                              border: '1px solid #d1d5db',
                              borderRadius: '6px',
                              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                              zIndex: 20,
                              minWidth: '175px',
                              padding: '0.25rem 0'
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => handleOpenInsert(sub.id, 'above')}
                              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.4rem 0.65rem', border: 'none', background: 'transparent', fontSize: '0.775rem', cursor: 'pointer' }}
                            >
                              Adicionar acima
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenInsert(sub.id, 'below')}
                              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.4rem 0.65rem', border: 'none', background: 'transparent', fontSize: '0.775rem', cursor: 'pointer' }}
                            >
                              Adicionar abaixo
                            </button>
                            {!isFirst && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuSubId(null);
                                  onReorderSubtarefa(task.id, sub.id, 'up');
                                }}
                                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.4rem 0.65rem', border: 'none', background: 'transparent', fontSize: '0.775rem', cursor: 'pointer' }}
                              >
                                Mover subtarefa para cima
                              </button>
                            )}
                            {!isLast && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuSubId(null);
                                  onReorderSubtarefa(task.id, sub.id, 'down');
                                }}
                                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.4rem 0.65rem', border: 'none', background: 'transparent', fontSize: '0.775rem', cursor: 'pointer' }}
                              >
                                Mover subtarefa para baixo
                              </button>
                            )}
                            {sub.tipo !== 'resultado' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuSubId(null);
                                  onDeleteSubtarefa(task.id, sub.id);
                                }}
                                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.4rem 0.65rem', border: 'none', background: 'transparent', fontSize: '0.775rem', color: '#ef4444', cursor: 'pointer' }}
                              >
                                Excluir subtarefa
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </li>

                    {isInsertingBelow && (
                      <li style={{ display: 'flex', gap: '0.35rem', marginTop: '0.35rem', marginBottom: '0.35rem', paddingLeft: '0.5rem' }}>
                        <input
                          type="text"
                          autoFocus
                          placeholder="Texto da nova subtarefa..."
                          value={newSubText}
                          onChange={(e) => setNewSubText(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleConfirmInsert()}
                          style={{ flex: 1, padding: '0.25rem 0.5rem', border: '1px solid #3b82f6', borderRadius: '4px', fontSize: '0.8rem' }}
                        />
                        <button type="button" onClick={handleConfirmInsert} style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', padding: '0.25rem 0.5rem', cursor: 'pointer' }}><Check size={14} /></button>
                        <button type="button" onClick={() => setInsertingForSubId(null)} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', padding: '0.25rem 0.5rem', cursor: 'pointer' }}><X size={14} /></button>
                      </li>
                    )}
                  </React.Fragment>
                );
              })}
            </ul>
          </div>

          <div style={{ marginTop: '1rem', position: 'relative' }}>
            <button
              type="button"
              ref={moveButtonRef}
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
                role="menu"
                onKeyDown={handleMoveMenuKeyDown}
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: '0.25rem',
                  backgroundColor: '#ffffff',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                  zIndex: 30,
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
                      role="menuitem"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveTask(task.id, col.id);
                        setShowMoveMenu(false);
                        moveButtonRef.current?.focus();
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
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f3f4f6'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
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
