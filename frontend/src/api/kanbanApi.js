import api from './axios';

export const getTarefas = () => api.get('/kanban/tarefas/');
export const createTarefa = (data) => api.post('/kanban/tarefas/', data);
export const updateTask = (id, data) => api.patch(`/kanban/tarefas/${id}/`, data);
export const deleteTarefa = (id) => api.delete(`/kanban/tarefas/${id}/`);

export const getContatos = () => api.get('/kanban/contatos/');
export const createContato = (data) => api.post('/kanban/contatos/', data);

export const getFluxos = () => api.get('/kanban/fluxos/');
export const createFluxo = (data) => api.post('/kanban/fluxos/', data);
export const updateFluxo = (id, data) => api.put(`/kanban/fluxos/${id}/`, data);

export const getSubtarefas = (tarefaId) => api.get(`/kanban/subtarefas/?tarefa=${tarefaId}`);
export const createSubtarefa = (data) => api.post('/kanban/subtarefas/', data);
export const updateSubtarefa = (id, data) => api.patch(`/kanban/subtarefas/${id}/`, data);
export const deleteSubtarefa = (id) => api.delete(`/kanban/subtarefas/${id}/`);

export const getUsuarios = () => api.get('/auth/usuarios/');
