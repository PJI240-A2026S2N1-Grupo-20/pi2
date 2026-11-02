import React, { useState, useEffect } from 'react';
import * as kanbanApi from '../api/kanbanApi';
import { X, Plus } from 'lucide-react';

export const TaskModal = ({ task, onClose, onTaskSaved }) => {
  const [contatos, setContatos] = useState([]);
  const [fluxos, setFluxos] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedFluxo, setSelectedFluxo] = useState(task?.fluxo ? String(task.fluxo) : '');
  const [selectedContato, setSelectedContato] = useState(task?.contato ? String(task.contato) : '');
  const [dataPrevista, setDataPrevista] = useState(task?.data_prevista || '');
  const [observacoes, setObservacoes] = useState(task?.observacoes || '');
  const [error, setError] = useState('');

  const [showNewContact, setShowNewContact] = useState(false);
  const [newContactInput, setNewContactInput] = useState('');
  const [contactError, setContactError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resContatos, resFluxos] = await Promise.all([
          kanbanApi.getContatos(),
          kanbanApi.getFluxos()
        ]);
        setContatos(resContatos.data || []);
        setFluxos(resFluxos.data || []);
      } catch (err) {
        console.error('Erro ao carregar dados no modal:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSaveContact = async (e) => {
    e.preventDefault();
    if (!newContactInput.trim()) {
      setContactError('Preencha o nome, e-mail ou telefone do contato.');
      return;
    }
    setContactError('');
    try {
      const val = newContactInput.trim();
      const payload = {
        nome: val.includes('@') ? '' : val,
        email: val.includes('@') ? val : '',
        telefone: !val.includes('@') && /^\d+$/.test(val.replace(/\D/g, '')) ? val : ''
      };
      if (!payload.nome && !payload.email && !payload.telefone) {
        payload.nome = val;
      }
      const res = await kanbanApi.createContato(payload);
      setContatos((prev) => [...prev, res.data]);
      setSelectedContato(res.data.id.toString());
      setShowNewContact(false);
      setNewContactInput('');
    } catch (err) {
      setContactError(err.response?.data?.detail || 'Erro ao cadastrar contato.');
    }
  };

  const handleSubmitTask = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = {
        fluxo: selectedFluxo ? parseInt(selectedFluxo, 10) : null,
        contato: selectedContato ? parseInt(selectedContato, 10) : null,
        data_prevista: dataPrevista || null,
        observacoes: observacoes.trim() || ''
      };

      if (task) {
        if (dataPrevista) {
          if (task.estado === 'pendencias') {
            payload.estado = 'a_fazer';
          }
        } else if (task.data_prevista && ['a_fazer', 'em_andamento'].includes(task.estado)) {
          // RF-15: remoção da data prevista retorna a tarefa para Pendências
          payload.estado = 'pendencias';
        }
        await kanbanApi.updateTask(task.id, payload);
      } else {
        await kanbanApi.createTarefa(payload);
      }

      if (onTaskSaved) onTaskSaved();
      onClose();
    } catch (err) {
      const detail = err.response?.data?.detail || err.response?.data?.data_prevista?.[0] || 'Erro ao salvar tarefa.';
      setError(detail);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'flex-start',
      zIndex: 1000,
      padding: '1rem',
      overflowY: 'auto'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        maxWidth: '500px',
        width: '100%',
        margin: 'auto',
        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
        padding: '1.5rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.75rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 'bold', margin: 0, color: '#111827' }}>
            {task ? 'Editar Tarefa' : 'Nova Tarefa'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={{ padding: '0.75rem', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>Carregando dados...</div>
        ) : (
          <form onSubmit={handleSubmitTask}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '500', marginBottom: '0.35rem', color: '#374151' }}>
                Fluxo de Negociação
              </label>
              <select
                value={selectedFluxo}
                onChange={(e) => setSelectedFluxo(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '16px' }}
              >
                <option value="">[Nenhum / Tarefa Livre]</option>
                {fluxos.map((f) => (
                  <option key={f.id} value={f.id}>{f.nome}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '500', color: '#374151' }}>
                  Contato
                </label>
                <button
                  type="button"
                  onClick={() => setShowNewContact(!showNewContact)}
                  style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                >
                  <Plus size={14} /> Novo
                </button>
              </div>

              {showNewContact ? (
                <div style={{ padding: '0.75rem', border: '1px dashed #3b82f6', borderRadius: '6px', backgroundColor: '#eff6ff', marginBottom: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="Digite Nome, E-mail ou Telefone *"
                    value={newContactInput}
                    onChange={(e) => setNewContactInput(e.target.value)}
                    style={{ width: '100%', padding: '0.4rem 0.6rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '16px', marginBottom: '0.5rem' }}
                  />
                  {contactError && <div style={{ color: '#dc2626', fontSize: '0.75rem', marginBottom: '0.35rem' }}>{contactError}</div>}
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={() => setShowNewContact(false)}
                      style={{ padding: '0.3rem 0.6rem', border: '1px solid #d1d5db', borderRadius: '4px', background: '#fff', fontSize: '0.8rem', cursor: 'pointer' }}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveContact}
                      style={{ padding: '0.3rem 0.6rem', border: 'none', borderRadius: '4px', background: '#2563eb', color: '#fff', fontSize: '0.8rem', cursor: 'pointer' }}
                    >
                      Salvar Contato
                    </button>
                  </div>
                </div>
              ) : (
                <select
                  value={selectedContato}
                  onChange={(e) => setSelectedContato(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '16px' }}
                >
                  <option value="">[Sem Contato Definido]</option>
                  {contatos.map((c) => {
                    const label = c.nome || c.email || c.telefone || `Contato #${c.id}`;
                    return <option key={c.id} value={c.id}>{label}</option>;
                  })}
                </select>
              )}
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '500', marginBottom: '0.35rem', color: '#374151' }}>
                Data Prevista
              </label>
              <input
                type="date"
                value={dataPrevista}
                onChange={(e) => setDataPrevista(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '16px' }}
              />
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '500', marginBottom: '0.35rem', color: '#374151' }}>
                Observações
              </label>
              <textarea
                rows={3}
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Detalhes sobre a negociação..."
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '16px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={onClose}
                style={{ padding: '0.5rem 1rem', border: '1px solid #d1d5db', borderRadius: '4px', background: '#f3f4f6', color: '#374151', fontSize: '0.875rem', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                style={{ padding: '0.5rem 1rem', border: 'none', borderRadius: '4px', background: '#2563eb', color: '#ffffff', fontWeight: '600', fontSize: '0.875rem', cursor: 'pointer' }}
              >
                {task ? 'Salvar Alterações' : 'Criar Tarefa'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
