import React from 'react';
import { TaskCard } from './TaskCard';

export const KanbanColumn = ({
  collection,
  tasks,
  expandedTaskId,
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
}) => {
  const handleDragOver = (e) => e.preventDefault();

  const handleDrop = (e) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) onMoveTask(taskId, collection.id);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={{
        backgroundColor: '#f8fafc',
        borderRadius: '8px',
        padding: '1rem',
        minHeight: '500px',
        border: '1px solid #e2e8f0',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>
          {collection.title}
        </h3>
        <span style={{
          backgroundColor: collection.color, color: '#ffffff',
          borderRadius: '12px', padding: '0.15rem 0.6rem',
          fontSize: '0.75rem', fontWeight: 'bold',
        }}>
          {tasks.length}
        </span>
      </div>

      <div>
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            isExpanded={expandedTaskId === task.id}
            onToggleExpand={() => onToggleExpand(task.id)}
            onMoveTask={onMoveTask}
            onToggleSubtarefa={onToggleSubtarefa}
            onUpdateSubtarefaOption={onUpdateSubtarefaOption}
            onAddSubtarefa={onAddSubtarefa}
            onDeleteSubtarefa={onDeleteSubtarefa}
            onReorderSubtarefa={onReorderSubtarefa}
            onEditTask={onEditTask}
            onReopenTask={onReopenTask}
            collections={collections}
          />
        ))}
      </div>
    </div>
  );
};
