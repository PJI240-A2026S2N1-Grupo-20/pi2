import React, { useState, useEffect } from 'react';
import * as kanbanApi from '../api/kanbanApi';
import { X, Plus, Trash2, ArrowUp, ArrowDown, RotateCcw } from 'lucide-react';

export const FluxoManagerModal = ({ onClose, onFluxosUpdated }) => {
  const [fluxos, setFluxos] = useState([]);
  const [editingFluxoId, setEditingFluxoId] = useState(null);
  const [nome, setNome] = useState('');
  const [passos, setPassos] = useState([]);
  const [novoPassoTexto, setNovoPassoTexto] = useState('');
  const [novoPassoOpcoes, setNovoPassoOpcoes] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const loadFluxos = async () => {
    try {
      const res = await kanbanApi.getFluxos();
      setFluxos(res.data || []);
    } catch (err) {
      setError('Erro ao carregar os fluxos.');
    }
  };

  useEffect(() => {
    loadFluxos();
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleStartNew = () => {
    setEditingFluxoId(null);
    setNome('');
    setPassos([]);
    setNovoPassoTexto('');
    setNovoPassoOpcoes('');
    setError('');
    setSuccess('');
  };

  const handleEdit = (fluxo) => {
    setEditingFluxoId(fluxo.id);
    setNome(fluxo.nome);
    setPassos(
      fluxo.passos
        ? fluxo.passos.map((p, idx) => ({
            id: p.id,
            texto: p.texto,
            ordem: idx + 1,
            opcoes: Array.isArray(p.opcoes) ? p.opcoes : [],
          }))
        : []
    );
    setNovoPassoTexto('');
    setNovoPassoOpcoes('');
    setError('');
    setSuccess('');
  };

  const parseOpcoes = (texto) =>
    String(texto || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

  const handleAddPasso = () => {
    if (!novoPassoTexto.trim()) return;
    setPassos((prev) => [
      ...prev,
      {
        texto: novoPassoTexto.trim(),
        ordem: prev.length + 1,
        opcoes: parseOpcoes(novoPassoOpcoes),
      },
    ]);
    setNovoPassoTexto('');
    setNovoPassoOpcoes('');
  };

  const handleRemovePasso = (index) => {
    setPassos((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((p, i) => ({ ...p, ordem: i + 1 }))
    );
  };

  const handleMovePasso = (index, direction) => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= passos.length) return;
    const newPassos = [...passos];
    const temp = newPassos[index];
    newPassos[index] = newPassos[newIndex];
    newPassos[newIndex] = temp;
    setPassos(newPassos.map((p, i) => ({ ...p, ordem: i + 1 })));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!nome.trim()) {
      setError('O nome do fluxo é obrigatório.');
      return;
    }
    setError('');
    setSuccess('');

    const payload = {
      nome: nome.trim(),
      ativo: true,
      passos: passos.map((p, idx) => ({
        texto: p.texto,
        ordem: idx + 1,
        opcoes: Array.isArray(p.opcoes) ? p.opcoes : [],
      })),
    };

    try {
      if (editingFluxoId) {
        await kanbanApi.updateFluxo(editingFluxoId, payload);
        setSuccess('Fluxo atualizado com sucesso.');
      } else {
        await kanbanApi.createFluxo(payload);
        setSuccess('Fluxo criado com sucesso.');
      }
      loadFluxos();
      if (onFluxosUpdated) onFluxosUpdated();
      handleStartNew();
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao salvar o fluxo.');
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
      <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', maxWidth: '750px', width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.75rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 'bold', margin: 0, color: '#111827' }}>
            Gerenciamento de Modelos de Fluxo
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
            <X size={20} />
          </button>
        </div>

        {error && <div style={{ padding: '0.75rem', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.85rem' }}>{error}</div>}
        {success && <div style={{ padding: '0.75rem', backgroundColor: '#d1fae5', color: '#065f46', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.85rem' }}>{success}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1.5fr', gap: '1.5rem' }}>
          <div style={{ borderRight: isMobile ? 'none' : '1px solid #e5e7eb', borderBottom: isMobile ? '1px solid #e5e7eb' : 'none', paddingRight: isMobile ? 0 : '1rem', paddingBottom: isMobile ? '1rem' : 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#374151' }}>Modelos Existentes</span>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {fluxos.map((f) => (
                <li key={f.id} style={{ marginBottom: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => handleEdit(f)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '0.5rem',
                      borderRadius: '4px',
                      border: editingFluxoId === f.id ? '2px solid #2563eb' : '1px solid #e5e7eb',
                      backgroundColor: editingFluxoId === f.id ? '#eff6ff' : '#f9fafb',
                      fontSize: '0.85rem',
                      cursor: 'pointer'
                    }}
                  >
                    <strong>{f.nome}</strong>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{f.passos?.length || 0} passo(s)</div>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <form onSubmit={handleSave}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 'bold', color: '#111827' }}>
                {editingFluxoId ? 'Editar Modelo de Fluxo' : 'Novo Modelo de Fluxo'}
              </h4>

              {editingFluxoId ? (
                <button
                  type="button"
                  onClick={handleStartNew}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    background: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.3rem 0.6rem',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  <Plus size={14} /> Sair / Novo
                </button>
              ) : (
                (nome || passos.length > 0) && (
                  <button
                    type="button"
                    onClick={handleStartNew}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      background: '#f3f4f6',
                      color: '#4b5563',
                      border: '1px solid #d1d5db',
                      padding: '0.3rem 0.6rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      cursor: 'pointer'
                    }}
                  >
                    <RotateCcw size={12} /> Limpar
                  </button>
                )
              )}
            </div>

            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>Nome do Fluxo *</label>
              <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Atendimento Comercial" style={{ width: '100%', padding: '0.4rem 0.6rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.85rem' }} />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '500', color: '#374151', marginBottom: '0.35rem' }}>Passos Predefinidos (Subtarefas)</label>
              <div style={{ display: 'grid', gap: '0.35rem', marginBottom: '0.5rem' }}>
                <input
                  type="text"
                  value={novoPassoTexto}
                  onChange={(e) => setNovoPassoTexto(e.target.value)}
                  placeholder="Texto do passo..."
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddPasso())}
                  style={{ width: '100%', padding: '0.35rem 0.5rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.8rem' }}
                />
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  <input
                    type="text"
                    value={novoPassoOpcoes}
                    onChange={(e) => setNovoPassoOpcoes(e.target.value)}
                    placeholder="Opções do passo, separadas por vírgula (opcional). Ex.: Sim, Não, Pendente"
                    style={{ flex: 1, padding: '0.35rem 0.5rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '0.8rem' }}
                  />
                  <button type="button" onClick={handleAddPasso} style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', padding: '0.35rem 0.6rem', fontSize: '0.8rem', cursor: 'pointer' }}>Adicionar</button>
                </div>
              </div>

              <ol style={{ paddingLeft: '1.25rem', margin: 0, fontSize: '0.8rem' }}>
                {passos.map((p, idx) => (
                  <li key={idx} style={{ marginBottom: '0.35rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.35rem', backgroundColor: '#f3f4f6', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
                      <div style={{ flex: 1 }}>
                        <span>{p.texto}</span>
                        {Array.isArray(p.opcoes) && p.opcoes.length > 0 && (
                          <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>
                            Opções: {p.opcoes.join(', ')}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '0.15rem' }}>
                        <button type="button" onClick={() => handleMovePasso(idx, 'up')} disabled={idx === 0} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '2px' }}><ArrowUp size={12} /></button>
                        <button type="button" onClick={() => handleMovePasso(idx, 'down')} disabled={idx === passos.length - 1} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '2px' }}><ArrowDown size={12} /></button>
                        <button type="button" onClick={() => handleRemovePasso(idx)} style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', padding: '2px' }}><Trash2 size={12} /></button>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button type="button" onClick={onClose} style={{ padding: '0.4rem 0.8rem', border: '1px solid #d1d5db', borderRadius: '4px', background: '#fff', fontSize: '0.8rem', cursor: 'pointer' }}>Cancelar</button>
              <button type="submit" style={{ padding: '0.4rem 0.8rem', border: 'none', borderRadius: '4px', background: '#2563eb', color: '#fff', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer' }}>
                {editingFluxoId ? 'Atualizar Fluxo' : 'Salvar Fluxo'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
