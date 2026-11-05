import React, { useState, useRef, useEffect } from 'react';
import {
  getTaskTitle, formatDateBR, formatDateTimeBR,
  ESTADO_LABEL, transicaoPermitida,
  getDelayInfo, DELAY_COLORS, DELAY_BADGE_STYLES, DELAY_STATUS,
} from '../utils/kanbanUtils';
import {
  ChevronDown, ChevronUp, MoveRight, User, Calendar,
  FileText, Plus, MoreHorizontal, Check, X, Edit2,
  RotateCcw, History, AlertTriangle, Clock,
} from 'lucide-react';

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
  onReopenTask,
  collections,
  limiares = { l1: 2, l2: 5 },
}) => {
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const [activeMenuSubId, setActiveMenuSubId] = useState(null);
  const [insertingForSubId, setInsertingForSubId] = useState(null);
  const [insertPosition, setInsertPosition] = useState('below');
  const [newSubText, setNewSubText] = useState('');
  const [showCardMenu, setShowCardMenu] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const moveMenuRef = useRef(null);
  const moveButtonRef = useRef(null);
  const cardMenuRef = useRef(null);
  const cardMenuButtonRef = useRef(null);
  const title = getTaskTitle(task);

  // RF-30: status de atraso em função dos limiares
  const delayInfo = getDelayInfo(task, limiares);
  const showDelayIndicator =
    delayInfo.status === DELAY_STATUS.warning || delayInfo.status === DELAY_STATUS.critical;
  const borderColor = DELAY_COLORS[delayInfo.status] || DELAY_COLORS.normal;
  const DelayIcon = delayInfo.status === DELAY_STATUS.warning ? Clock : AlertTriangle;

  useEffect(() => {
    if (showMoveMenu && moveMenuRef.current) {
      const timer = setTimeout(() => {
        if (moveMenuRef.current) {
          const firstOption = moveMenuRef.current.querySelector('button');
          if (firstOption) firstOption.focus({ preventScroll: true });
          if (typeof moveMenuRef.current.scrollIntoView === 'function') {
            moveMenuRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
          }
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [showMoveMenu]);

  useEffect(() => {
    if (!showMoveMenu && activeMenuSubId === null && !showCardMenu && !showHistory) return;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (showMoveMenu) {
        setShowMoveMenu(false);
        moveButtonRef.current?.focus();
      }
      if (activeMenuSubId !== null) setActiveMenuSubId(null);
      if (showCardMenu) {
        setShowCardMenu(false);
        cardMenuButtonRef.current?.focus();
      }
      if (showHistory) setShowHistory(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showMoveMenu, activeMenuSubId, showCardMenu, showHistory]);

  useEffect(() => {
    if (!showCardMenu) return;
    const onMouseDown = (e) => {
      const wrap = cardMenuRef.current?.parentElement;
      if (wrap && !wrap.contains(e.target)) setShowCardMenu(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [showCardMenu]);

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
      if (e.key === 'ArrowDown') nextIdx = currentIdx < buttons.length - 1 ? currentIdx + 1 : 0;
      else nextIdx = currentIdx > 0 ? currentIdx - 1 : buttons.length - 1;
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

  const destinos = collections.filter((col) => {
    if (col.id === task.estado) return false;
    if (!transicaoPermitida(task.estado, col.id)) return false;
    return true;
  });

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      style={{
        backgroundColor: '#ffffff', borderRadius: '6px',
        border: '1px solid #e5e7eb', borderLeft: `4px solid ${borderColor}`,
        padding: '0.875rem', marginBottom: '0.75rem',
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)', cursor: 'grab',
      }}
      aria-expanded={isExpanded}
      data-delay-status={delayInfo.status}
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
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'flex-start', cursor: 'pointer', gap: '0.5rem',
        }}
      >
        <h4 style={{ fontSize: '0.95rem', fontWeight: '600', color: '#1f2937', margin: 0, flex: 1 }}>
          {title}
        </h4>

        {/* RF-30: ponto colorido sempre visível (colapsado) com aria-label */}
        {showDelayIndicator && (
          <span
            aria-label={`Alerta de prazo: ${delayInfo.label}`}
            title={delayInfo.label}
            style={{
              display: 'inline-block',
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: borderColor,
              flexShrink: 0,
              marginTop: '0.35rem',
              boxShadow: '0 0 0 2px #fff',
            }}
          />
        )}

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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.35rem' }}>
            {task.data_prevista ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#374151', flexWrap: 'wrap' }}>
                <Calendar size={14} color={borderColor} />
                <span><strong>Previsão:</strong> {formatDateBR(task.data_prevista)}</span>

                {/* RF-30: badge textual (não depende só de cor - RNF-01) */}
                {showDelayIndicator && (
                  <span
                    role="status"
                    aria-label={delayInfo.label}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '10px',
                      fontSize: '0.72rem',
                      fontWeight: '700',
                      ...DELAY_BADGE_STYLES[delayInfo.status],
                    }}
                  >
                    <DelayIcon size={12} />
                    {delayInfo.label}
                  </span>
                )}
              </div>
            ) : (
              <span style={{ fontSize: '0.8rem', color: '#9ca3af', fontStyle: 'italic' }}>Sem data prevista</span>
            )}

            <div style={{ display: 'flex', gap: '0.35rem', position: 'relative' }}>
              {task.estado === 'concluido' && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onReopenTask(task); }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                    backgroundColor: '#fef3c7', color: '#92400e',
                    border: '1px solid #fde68a', borderRadius: '4px',
                    padding: '0.2rem 0.5rem', fontSize: '0.75rem',
                    fontWeight: '600', cursor: 'pointer',
                  }}
                >
                  <RotateCcw size={12} /> Reabrir
                </button>
              )}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onEditTask(task); }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                  backgroundColor: '#eff6ff', color: '#2563eb',
                  border: '1px solid #bfdbfe', borderRadius: '4px',
                  padding: '0.2rem 0.5rem', fontSize: '0.75rem',
                  fontWeight: '600', cursor: 'pointer',
                }}
              >
                <Edit2 size={12} /> Editar
              </button>
              <button
                type="button"
                ref={cardMenuButtonRef}
                aria-label="Mais ações"
                aria-haspopup="true"
                aria-expanded={showCardMenu}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCardMenu((v) => !v);
                }}
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  backgroundColor: '#f3f4f6', color: '#4b5563',
                  border: '1px solid #d1d5db', borderRadius: '4px',
                  padding: '0.2rem 0.4rem', fontSize: '0.75rem',
                  fontWeight: '600', cursor: 'pointer',
                }}
              >
                <MoreHorizontal size={14} />
              </button>

              {showCardMenu && (
                <div
                  ref={cardMenuRef}
                  role="menu"
                  style={{
                    position: 'absolute', top: '100%', right: 0, marginTop: '0.25rem',
                    backgroundColor: '#ffffff', border: '1px solid #d1d5db',
                    borderRadius: '6px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                    zIndex: 40, minWidth: '200px', padding: '0.25rem 0',
                  }}
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowCardMenu(false);
                      setShowHistory(true);
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.4rem',
                      width: '100%', textAlign: 'left',
                      padding: '0.45rem 0.75rem', border: 'none',
                      background: 'transparent', fontSize: '0.8rem',
                      color: '#1f2937', cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f3f4f6'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    <History size={14} /> Histórico de transições
                  </button>
                </div>
              )}
            </div>
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
                        <label
                          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, marginRight: '0.5rem', cursor: 'pointer' }}
                        >
                          <input
                            type="checkbox"
                            checked={sub.concluida || sub.opcao_selecionada === 'Concluída'}
                            onChange={() => onToggleSubtarefa(task.id, sub.id, sub.concluida)}
                            style={{ cursor: 'pointer' }}
                          />
                          <span style={{
                            textDecoration: sub.concluida ? 'line-through' : 'none',
                            color: sub.concluida ? '#9ca3af' : '#374151',
                            fontSize: '0.825rem',
                          }}>
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
                          <div style={{
                            position: 'absolute', right: 0, top: '100%',
                            backgroundColor: '#ffffff', border: '1px solid #d1d5db',
                            borderRadius: '6px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                            zIndex: 20, minWidth: '175px', padding: '0.25rem 0',
                          }}>
                            <button type="button" onClick={() => handleOpenInsert(sub.id, 'above')} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.4rem 0.65rem', border: 'none', background: 'transparent', fontSize: '0.775rem', cursor: 'pointer' }}>
                              Adicionar acima
                            </button>
                            <button type="button" onClick={() => handleOpenInsert(sub.id, 'below')} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.4rem 0.65rem', border: 'none', background: 'transparent', fontSize: '0.775rem', cursor: 'pointer' }}>
                              Adicionar abaixo
                            </button>
                            {!isFirst && (
                              <button type="button" onClick={() => { setActiveMenuSubId(null); onReorderSubtarefa(task.id, sub.id, 'up'); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.4rem 0.65rem', border: 'none', background: 'transparent', fontSize: '0.775rem', cursor: 'pointer' }}>
                                Mover subtarefa para cima
                              </button>
                            )}
                            {!isLast && (
                              <button type="button" onClick={() => { setActiveMenuSubId(null); onReorderSubtarefa(task.id, sub.id, 'down'); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.4rem 0.65rem', border: 'none', background: 'transparent', fontSize: '0.775rem', cursor: 'pointer' }}>
                                Mover subtarefa para baixo
                              </button>
                            )}
                            {sub.tipo !== 'resultado' && (
                              <button type="button" onClick={() => { setActiveMenuSubId(null); onDeleteSubtarefa(task.id, sub.id); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.4rem 0.65rem', border: 'none', background: 'transparent', fontSize: '0.775rem', color: '#ef4444', cursor: 'pointer' }}>
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
              onClick={(e) => { e.stopPropagation(); setShowMoveMenu(!showMoveMenu); }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                backgroundColor: '#f3f4f6', border: '1px solid #d1d5db',
                padding: '0.4rem 0.65rem', borderRadius: '4px',
                fontSize: '0.8rem', fontWeight: '500',
                color: '#374151', cursor: 'pointer',
              }}
              aria-haspopup="true"
              aria-expanded={showMoveMenu}
            >
              <MoveRight size={14} /> Mover para...
            </button>

            {showMoveMenu && destinos.length > 0 && (
              <div
                ref={moveMenuRef}
                role="menu"
                onKeyDown={handleMoveMenuKeyDown}
                style={{
                  position: 'absolute', top: '100%', left: 0, marginTop: '0.25rem',
                  backgroundColor: '#ffffff', border: '1px solid #d1d5db',
                  borderRadius: '6px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                  zIndex: 30, minWidth: '160px', padding: '0.25rem 0',
                }}
              >
                {destinos.map((col) => (
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
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '0.5rem 0.75rem', backgroundColor: 'transparent',
                      border: 'none', fontSize: '0.8rem', color: '#1f2937', cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f3f4f6'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    {col.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showHistory && (
        <div
          onClick={(e) => { e.stopPropagation(); setShowHistory(false); }}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            zIndex: 1200, padding: '1rem',
          }}
        >
          <div
            role="dialog"
            aria-label="Histórico de Transições"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff', borderRadius: '8px',
              maxWidth: '540px', width: '100%',
              maxHeight: '80vh', overflowY: 'auto',
              padding: '1.25rem',
              boxShadow: '0 10px 15px -3px rgba(0,0,0,0.15)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 'bold', color: '#111827' }}>
                Histórico de Transições
              </h3>
              <button
                type="button"
                onClick={() => setShowHistory(false)}
                aria-label="Fechar"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}
              >
                <X size={20} />
              </button>
            </div>

            {(!task.transicoes || task.transicoes.length === 0) ? (
              <p style={{ color: '#6b7280', fontSize: '0.85rem', margin: 0 }}>
                Nenhuma transição registrada para esta tarefa.
              </p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.8rem', color: '#374151' }}>
                {task.transicoes.map((t) => (
                  <li key={t.id} style={{ padding: '0.5rem 0', borderBottom: '1px solid #f3f4f6' }}>
                    <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#6b7280' }}>
                      {formatDateTimeBR(t.data_hora)}
                    </div>
                    <div style={{ marginTop: '0.15rem' }}>
                      <strong>{ESTADO_LABEL[t.origem] || t.origem}</strong>
                      {' → '}
                      <strong>{ESTADO_LABEL[t.destino] || t.destino}</strong>
                      {t.usuario_nome && (
                        <span style={{ color: '#6b7280' }}> · {t.usuario_nome}</span>
                      )}
                    </div>
                    {t.justificativa && (
                      <div style={{ fontStyle: 'italic', color: '#4b5563', marginTop: '0.15rem' }}>
                        "{t.justificativa}"
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
