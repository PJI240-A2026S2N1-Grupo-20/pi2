import React from 'react';
import { TaskCard } from './TaskCard';
import { sortTasksChronologically } from '../utils/kanbanUtils';

export const KanbanColumn = ({
  collection,
  tasks,
  expandedTaskId,
  onToggleExpandTask,
  onMoveTask,
  collections
}) => {
  // RF-07: Ordenação cronológica (tarefas mais antigas no topo)
  const sortedTasks = sortTasksChronologically(tasks);

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      onMoveTask(taskId, collection.id);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={{
        backgroundColor: '#f9fafb',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '350px'
      }}
    >
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem',
        paddingBottom: '0.5rem',
        borderBottom: `2px solid ${collection.color}`
      }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 'bold', color: '#111827', margin: 0 }}>
          {collection.title}
        </h3>
        <span style={{
          backgroundColor: '#e5e7eb',
          color: '#374151',
          padding: '0.15rem 0.5rem',
          borderRadius: '12px',
          fontSize: '0.75rem',
          fontWeight: '600'
        }}>
          {tasks.length}
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {sortedTasks.length === 0 ? (
          <div style={{
            textAlign: 'center',
            color: '#9ca3af',
            padding: '2rem 0',
            fontSize: '0.85rem',
            fontStyle: 'italic'
          }}>
            Nenhuma tarefa nesta coleção
          </div>
        ) : (
          sortedTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              isExpanded={expandedTaskId === task.id}
              onToggleExpand={() => onToggleExpandTask(task.id)}
              onMoveTask={onMoveTask}
              collections={collections}
            />
          ))
        )}
      </div>
    </div>
  );
};
