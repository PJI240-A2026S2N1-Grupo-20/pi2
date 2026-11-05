import React, { useState, useEffect } from 'react';
import { KanbanColumn } from './KanbanColumn';
import { TaskModal } from './TaskModal';
import { ConfirmTransitionModal } from './ConfirmTransitionModal';
import { sortTasksChronologically } from '../utils/kanbanUtils';
import * as kanbanApi from '../api/kanbanApi';
import { Plus } from 'lucide-react';

const COLLECTIONS = [
  { id: 'pendencias', title: 'Pendências', color: '#6b7280' },
  { id: 'a_fazer', title: 'A fazer', color: '#f59e0b' },
  { id: 'em_andamento', title: 'Em andamento', color: '#3b82f6' },
  { id: 'concluido', title: 'Concluído', color: '#10b981' },
];

export const KanbanBoard = ({ limiares = { l1: 2, l2: 5 } }) => {
  const [tasks, setTasks] = useState([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  const [activeCollection, setActiveCollection] = useState(() => {
    return localStorage.getItem('eletrokanban_active_collection') || 'pendencias';
  });
  const [expandedTaskId, setExpandedTaskId] = useState(() => {
    return localStorage.getItem('eletrokanban_expanded_task') || null;
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState(null);
  const [pendingTransition, setPendingTransition] = useState(null);

  const showFeedback = (msg) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(''), 4500);
  };

  const fetchTasks = async () => {
    try {
      const response = await kanbanApi.getTarefas();
      setTasks(sortTasksChronologically(response.data));
    } catch (err) {
      showFeedback("Erro de conexão: Não foi possível carregar as tarefas do servidor.");
      setTasks([]);
    }
  };

  useEffect(() => { fetchTasks(); }, []);

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

  const handleToggleExpand = (taskId) => {
    setExpandedTaskId((prevId) => (String(prevId) === String(taskId) ? null : taskId));
  };

  const handleOpenCreateModal = () => {
    setTaskToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (task) => {
    setTaskToEdit(task);
    setIsModalOpen(true);
  };

  // ---------------------------------------------------------- transições
  const executeMove = async (taskId, novoEstado, extraPayload = {}) => {
    const task = tasks.find((t) => String(t.id) === String(taskId));
    if (!task) return;
    const snapshot = { estado: task.estado, data_prevista: task.data_prevista };

    setTasks((prev) =>
      prev.map((t) =>
        String(t.id) === String(taskId)
          ? { ...t, estado: novoEstado, ...extraPayload }
          : t
      )
    );

    try {
      await kanbanApi.updateTask(taskId, { estado: novoEstado, ...extraPayload });
    } catch (err) {
      setTasks((prev) =>
        prev.map((t) => (String(t.id) === String(taskId) ? { ...t, ...snapshot } : t))
      );
      const detail = err.response?.data?.detail || "Erro no servidor ao atualizar a coleção.";
      showFeedback(detail);
    }
  };

  const handleMoveTask = async (taskId, novoEstado) => {
    const task = tasks.find((t) => String(t.id) === String(taskId));
    if (!task) return;
    if (task.estado === novoEstado) return;

    // Reabertura: tarefa em Concluído
    if (task.estado === 'concluido') {
      if (novoEstado === 'pendencias') {
        showFeedback("Ação negada: Reabra a tarefa para 'A fazer' ou 'Em andamento'.");
        return;
      }
      setPendingTransition({ type: 'reabrir', task, destino: novoEstado });
      return;
    }

    // Data obrigatória em A fazer / Em andamento (RN-09): abre popup para definir
    if (['a_fazer', 'em_andamento'].includes(novoEstado) && !task.data_prevista) {
      setPendingTransition({ type: 'definir_data', task, destino: novoEstado });
      return;
    }

    // Concluir: popup obrigatório (RN-04 / RF-17)
    if (novoEstado === 'concluido') {
      setPendingTransition({ type: 'concluir', task, destino: novoEstado });
      return;
    }

    // Voltar para Pendências (RN-04 / RF-15)
    if (novoEstado === 'pendencias' && ['a_fazer', 'em_andamento'].includes(task.estado)) {
      setPendingTransition({ type: 'voltar_pendencias', task, destino: novoEstado });
      return;
    }

    await executeMove(taskId, novoEstado);
  };

  const handleConfirmTransition = async (payload) => {
    const pt = pendingTransition;
    if (!pt) return;
    setPendingTransition(null);

    if (pt.type === 'reabrir') {
      try {
        await kanbanApi.reabrirTask(pt.task.id, payload);
        fetchTasks();
      } catch (err) {
        showFeedback(err.response?.data?.detail || "Erro ao reabrir a tarefa.");
      }
      return;
    }

    if (pt.type === 'definir_data') {
      await executeMove(pt.task.id, pt.destino, { data_prevista: payload.data_prevista });
      return;
    }

    if (pt.type === 'concluir') {
      const resSub = pt.task.subtarefas?.find((s) => s.tipo === 'resultado');
      if (resSub) {
        try {
          await kanbanApi.updateSubtarefa(resSub.id, {
            opcao_selecionada: payload.resultado,
            concluida: payload.resultado === 'Concluída',
          });
        } catch (err) {
          showFeedback(err.response?.data?.detail || "Erro ao registrar o resultado.");
          return;
        }
      }
    }

    const extra = pt.type === 'voltar_pendencias' ? { data_prevista: null } : {};
    await executeMove(pt.task.id, pt.destino, extra);

    if (pt.type === 'concluir') {
      await fetchTasks();
    }
  };

  // ---------------------------------------------------------- subtarefas
  const handleToggleSubtarefa = async (taskId, subId, currentConcluida) => {
    const newConcluida = !currentConcluida;
    setTasks((prev) =>
      prev.map((t) => {
        if (String(t.id) !== String(taskId)) return t;
        return {
          ...t,
          subtarefas: t.subtarefas.map((s) =>
            String(s.id) === String(subId) ? { ...s, concluida: newConcluida } : s
          ),
        };
      })
    );
    try {
      await kanbanApi.updateSubtarefa(subId, { concluida: newConcluida });
    } catch (err) {
      fetchTasks();
    }
  };

  const handleUpdateSubtarefaOption = async (taskId, subId, optionValue) => {
    const isDone = optionValue === 'Concluída';
    setTasks((prev) =>
      prev.map((t) => {
        if (String(t.id) !== String(taskId)) return t;
        return {
          ...t,
          subtarefas: t.subtarefas.map((s) =>
            String(s.id) === String(subId)
              ? { ...s, opcao_selecionada: optionValue, concluida: isDone }
              : s
          ),
        };
      })
    );
    try {
      await kanbanApi.updateSubtarefa(subId, { opcao_selecionada: optionValue, concluida: isDone });
    } catch (err) {
      fetchTasks();
    }
  };

  const handleAddSubtarefa = async (taskId, text, targetSubId, position) => {
    const task = tasks.find((t) => String(t.id) === String(taskId));
    if (!task) return;
    const currentSubs = task.subtarefas || [];
    let insertIndex = currentSubs.length;
    if (targetSubId) {
      const idx = currentSubs.findIndex((s) => String(s.id) === String(targetSubId));
      if (idx !== -1) insertIndex = position === 'above' ? idx : idx + 1;
    }
    try {
      await kanbanApi.createSubtarefa({
        tarefa: parseInt(taskId, 10),
        texto: text,
        tipo: 'livre',
        ordem: insertIndex + 1,
        concluida: false,
      });
      fetchTasks();
    } catch (err) {
      const detail = err.response?.data?.detail || "Erro ao criar subtarefa.";
      showFeedback(detail);
    }
  };

  const handleDeleteSubtarefa = async (taskId, subId) => {
    try {
      await kanbanApi.deleteSubtarefa(subId);
      fetchTasks();
    } catch (err) {
      const detail = err.response?.data?.detail || "Erro ao excluir subtarefa.";
      showFeedback(detail);
    }
  };

  const handleReorderSubtarefa = async (taskId, subId, direction) => {
    const task = tasks.find((t) => String(t.id) === String(taskId));
    if (!task || !task.subtarefas) return;

    const subs = [...task.subtarefas];
    const index = subs.findIndex((s) => String(s.id) === String(subId));
    if (index === -1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= subs.length) return;

    const temp = subs[index];
    subs[index] = subs[targetIndex];
    subs[targetIndex] = temp;

    const updatedSubs = subs.map((s, i) => ({ ...s, ordem: i + 1 }));
    setTasks((prev) =>
      prev.map((t) => (String(t.id) === String(taskId) ? { ...t, subtarefas: updatedSubs } : t))
    );
    try {
      await Promise.all(updatedSubs.map((s) => kanbanApi.updateSubtarefa(s.id, { ordem: s.ordem })));
    } catch (err) {
      fetchTasks();
    }
  };

  // ---------------------------------------------------------- render
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <button
          onClick={handleOpenCreateModal}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            backgroundColor: '#2563eb', color: '#ffffff', border: 'none',
            padding: '0.6rem 1.2rem', borderRadius: '6px',
            fontWeight: '600', cursor: 'pointer',
          }}
        >
          <Plus size={18} /> Nova Tarefa
        </button>
      </div>

      {isMobile ? (
        <div>
          <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1rem', overflowX: 'auto' }}>
            {COLLECTIONS.map((col) => {
              const count = tasks.filter((t) => t.estado === col.id).length;
              const isActive = activeCollection === col.id;
              return (
                <button
                  key={col.id}
                  onClick={() => setActiveCollection(col.id)}
                  style={{
                    flex: 1, padding: '0.6rem 0.25rem', borderRadius: '6px',
                    border: 'none', backgroundColor: isActive ? col.color : '#e5e7eb',
                    color: isActive ? '#ffffff' : '#374151',
                    fontWeight: 'bold', fontSize: '0.8rem', cursor: 'pointer',
                  }}
                >
                  {col.title} ({count})
                </button>
              );
            })}
          </div>
          <KanbanColumn
            collection={COLLECTIONS.find((c) => c.id === activeCollection)}
            tasks={tasks.filter((t) => t.estado === activeCollection)}
            expandedTaskId={expandedTaskId}
            onToggleExpand={handleToggleExpand}
            onMoveTask={handleMoveTask}
            onToggleSubtarefa={handleToggleSubtarefa}
            onUpdateSubtarefaOption={handleUpdateSubtarefaOption}
            onAddSubtarefa={handleAddSubtarefa}
            onDeleteSubtarefa={handleDeleteSubtarefa}
            onReorderSubtarefa={handleReorderSubtarefa}
            onEditTask={handleOpenEditModal}
            onReopenTask={(task) => setPendingTransition({ type: 'reabrir', task })}
            collections={COLLECTIONS}
            limiares={limiares}
          />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', alignItems: 'start' }}>
          {COLLECTIONS.map((col) => (
            <KanbanColumn
              key={col.id}
              collection={col}
              tasks={tasks.filter((t) => t.estado === col.id)}
              expandedTaskId={expandedTaskId}
              onToggleExpand={handleToggleExpand}
              onMoveTask={handleMoveTask}
              onToggleSubtarefa={handleToggleSubtarefa}
              onUpdateSubtarefaOption={handleUpdateSubtarefaOption}
              onAddSubtarefa={handleAddSubtarefa}
              onDeleteSubtarefa={handleDeleteSubtarefa}
              onReorderSubtarefa={handleReorderSubtarefa}
              onEditTask={handleOpenEditModal}
              onReopenTask={(task) => setPendingTransition({ type: 'reabrir', task })}
              collections={COLLECTIONS}
            limiares={limiares}
            />
          ))}
        </div>
      )}

      {isModalOpen && (
        <TaskModal
          task={taskToEdit}
          onClose={() => { setIsModalOpen(false); setTaskToEdit(null); }}
          onTaskSaved={fetchTasks}
        />
      )}

      {pendingTransition && (
        <ConfirmTransitionModal
          transition={pendingTransition}
          onCancel={() => setPendingTransition(null)}
          onConfirm={handleConfirmTransition}
        />
      )}

      {feedbackMsg && (
        <div
          aria-live="assertive"
          style={{
            position: 'fixed', bottom: '24px', left: '50%',
            transform: 'translateX(-50%)', backgroundColor: '#1f2937',
            color: '#ffffff', padding: '0.75rem 1.25rem', borderRadius: '6px',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
            zIndex: 9999, fontWeight: '500', fontSize: '0.9rem',
            textAlign: 'center', maxWidth: '90vw',
          }}
        >
          {feedbackMsg}
        </div>
      )}
    </div>
  );
};
