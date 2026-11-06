import React, { useState, useEffect, useMemo } from 'react';
import * as kanbanApi from '../api/kanbanApi';
import { useAuth } from '../context/AuthContext';
import { X, Plus, Search } from 'lucide-react';
import { DatePickerBR } from './DatePickerBR';
import { AnexoManager } from './AnexoManager';
import { EntradaAssistida } from './EntradaAssistida';
import { formatDateBR } from '../utils/kanbanUtils';

const baseInput = {
  width: '100%',
  padding: '0.5rem',
  border: '1px solid #d1d5db',
  borderRadius: '4px',
  fontSize: '16px',
};

const formatarValorInput = (n) => {
  if (n === null || n === undefined || Number.isNaN(n)) return '';
  return Number(n).toFixed(2).replace('.', ',');
};

const parseValorInput = (s) => {
  if (s === '' || s === null || s === undefined) return null;
  const limpo = String(s).replace(/\./g, '').replace(',', '.');
  const n = parseFloat(limpo);
  return Number.isFinite(n) ? n : null;
};

export const TaskModal = ({ task, onClose, onTaskSaved }) => {
  const { user: currentUser } = useAuth();
  // Superusuário (criado por createsuperuser) também pode reatribuir responsáveis.
  const canAssign = Boolean(
    currentUser?.is_admin ||
    currentUser?.is_superuser ||
    ['subgerente', 'gerente', 'administrador'].includes(currentUser?.papel)
  );

  const [contatos, setContatos] = useState([]);
  const [fluxos, setFluxos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedFluxo, setSelectedFluxo] = useState(task?.fluxo ? String(task.fluxo) : '');
  const [selectedContato, setSelectedContato] = useState(task?.contato ? String(task.contato) : '');
  const [contactSearch, setContactSearch] = useState('');
  const [selectedResponsavel, setSelectedResponsavel] = useState(task?.responsavel ? String(task.responsavel) : '');
  const [justificativaResponsavel, setJustificativaResponsavel] = useState('');
  const [dataPrevista, setDataPrevista] = useState(task?.data_prevista || '');
  const [observacoes, setObservacoes] = useState(task?.observacoes || '');

  // Campos de orçamento (RF-24, RF-25, RF-26)
  const [numeroOrcamento, setNumeroOrcamento] = useState(task?.numero_orcamento || '');
  const [validadeOrcamento, setValidadeOrcamento] = useState(task?.validade_orcamento || '');
  const [vlProdutos, setVlProdutos] = useState(
    task?.vl_produtos !== null && task?.vl_produtos !== undefined
      ? Number(task.vl_produtos) : null,
  );
  const [vlDesconto, setVlDesconto] = useState(
    task?.vl_desconto !== null && task?.vl_desconto !== undefined
      ? Number(task.vl_desconto) : null,
  );
  const [vlIcmsSt, setVlIcmsSt] = useState(
    task?.vl_icms_st !== null && task?.vl_icms_st !== undefined
      ? Number(task.vl_icms_st) : null,
  );
  const [vlTotal, setVlTotal] = useState(
    task?.vl_total !== null && task?.vl_total !== undefined
      ? Number(task.vl_total) : null,
  );

  const [error, setError] = useState('');
  const [duplicadoInfo, setDuplicadoInfo] = useState(null);

  const [showNewContact, setShowNewContact] = useState(false);
  const [newContactInput, setNewContactInput] = useState('');
  const [contactError, setContactError] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [arquivosPendentes, setArquivosPendentes] = useState([]);
  const [clienteSugerido, setClienteSugerido] = useState(null);
  const [tarefaCriada, setTarefaCriada] = useState(null);

  // RF-15: tarefa adiada
  const [registrarAdiada, setRegistrarAdiada] = useState(true);
  const [originalDataPrevista] = useState(task?.data_prevista || '');

  const originalResponsavelId = task?.responsavel ? String(task.responsavel) : '';
  const responsavelAlterado =
    Boolean(task) && canAssign && selectedResponsavel !== originalResponsavelId;

  const dataAlterada = Boolean(
    task &&
    originalDataPrevista &&
    dataPrevista &&
    dataPrevista !== originalDataPrevista
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resContatos, resFluxos, resUsuarios] = await Promise.all([
          kanbanApi.getContatos(),
          kanbanApi.getFluxos(),
          kanbanApi.getUsuarios(),
        ]);
        setContatos(resContatos.data || []);
        setFluxos(resFluxos.data || []);
        setUsuarios(resUsuarios.data || []);
      } catch (err) {
        console.error('Erro ao carregar dados no modal:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const contatosFiltrados = useMemo(() => {
    const termo = contactSearch.trim().toLowerCase();
    if (!termo) return contatos;

    const found = contatos.filter((c) => {
      const nome = (c.nome || '').toLowerCase();
      const email = (c.email || '').toLowerCase();
      const telefone = (c.telefone || '').replace(/\D/g, '');
      const termoDigitos = termo.replace(/\D/g, '');
      return (
        nome.includes(termo) ||
        email.includes(termo) ||
        (termoDigitos && telefone.includes(termoDigitos))
      );
    });

    if (selectedContato && !found.some((c) => String(c.id) === String(selectedContato))) {
      const sel = contatos.find((c) => String(c.id) === String(selectedContato));
      if (sel) found.unshift(sel);
    }
    return found;
  }, [contactSearch, contatos, selectedContato]);

  const handleSearchKeyDown = (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    e.stopPropagation();
    const termo = contactSearch.trim();
    if (!termo) return;
    if (contatosFiltrados.length === 1) {
      setSelectedContato(String(contatosFiltrados[0].id));
    }
  };

  const handleSaveContact = async (e) => {
    e.preventDefault();
    if (!newContactInput.trim()) {
      setContactError('Preencha o nome, e-mail ou telefone do contato.');
      return;
    }
    setContactError('');
    setContactInfo('');
    try {
      const val = newContactInput.trim();
      const payload = {
        nome: val.includes('@') ? '' : val,
        email: val.includes('@') ? val : '',
        telefone: !val.includes('@') && /^\d+$/.test(val.replace(/\D/g, '')) ? val : '',
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
      const data = err.response?.data;
      if (data && data.existing) {
        setContatos((prev) => {
          const existe = prev.some((c) => String(c.id) === String(data.existing.id));
          return existe ? prev : [...prev, data.existing];
        });
        setSelectedContato(String(data.existing.id));
        setShowNewContact(false);
        setNewContactInput('');
        setContactError('');
        const exibicao =
          data.existing.nome ||
          data.existing.email ||
          data.existing.telefone ||
          `Contato #${data.existing.id}`;
        setContactInfo(
          `Já existe um contato com estes dados ("${exibicao}"). ` +
          'Ele foi selecionado automaticamente.'
        );
        setTimeout(() => setContactInfo(''), 6000);
      } else {
        setContactError(data?.detail || 'Erro ao cadastrar contato.');
      }
    }
  };

  const montarPayload = (extra = {}) => {
    const payload = {
      fluxo: selectedFluxo ? parseInt(selectedFluxo, 10) : null,
      contato: selectedContato ? parseInt(selectedContato, 10) : null,
      data_prevista: dataPrevista || null,
      observacoes: observacoes.trim() || '',
      numero_orcamento: numeroOrcamento ? numeroOrcamento.trim() : null,
      validade_orcamento: validadeOrcamento || null,
      vl_produtos: vlProdutos,
      vl_desconto: vlDesconto,
      vl_icms_st: vlIcmsSt,
      vl_total: vlTotal,
      ...extra,
    };

    if (canAssign && selectedResponsavel) {
      payload.responsavel = parseInt(selectedResponsavel, 10);
    }
    return payload;
  };

  const registrarSubtarefaAdiada = async (tarefaId, novaData) => {
    try {
      await kanbanApi.createSubtarefa({
        tarefa: tarefaId,
        texto: `Tarefa adiada para ${formatDateBR(novaData)}`,
        tipo: 'justificativa',
        ordem: 998,
        concluida: true,
      });
    } catch (err) {
      console.error('Falha ao registrar subtarefa Tarefa adiada:', err);
    }
  };

  const submeter = async (extra = {}) => {
    setError('');
    try {
      const payload = montarPayload(extra);

      if (task) {
        if (responsavelAlterado) {
          payload.justificativa_responsavel = justificativaResponsavel.trim();
        }
        if (dataPrevista) {
          if (task.estado === 'pendencias') {
            payload.estado = 'a_fazer';
          }
        } else if (task.data_prevista && ['a_fazer', 'em_andamento'].includes(task.estado)) {
          payload.estado = 'pendencias';
        }
        await kanbanApi.updateTask(task.id, payload);

        if (dataAlterada && registrarAdiada) {
          await registrarSubtarefaAdiada(task.id, dataPrevista);
        }
      } else {
        const resposta = await kanbanApi.createTarefa(payload);
        const novaTarefa = resposta.data;

        if (arquivosPendentes.length > 0 && novaTarefa && novaTarefa.id) {
          const falhas = [];
          for (const f of arquivosPendentes) {
            try {
              await kanbanApi.uploadAnexo(novaTarefa.id, f);
            } catch (err) {
              falhas.push(f.name);
            }
          }
          if (falhas.length > 0) {
            setTarefaCriada(novaTarefa);
            setArquivosPendentes([]);
            setError(
              'Tarefa criada, mas não foi possível enviar: ' +
                falhas.join(', ') +
                '. Feche e abra a tarefa em Editar para tentar novamente.'
            );
            if (onTaskSaved) onTaskSaved();
            return;
          }
        }
      }

      if (onTaskSaved) onTaskSaved();
      onClose();
    } catch (err) {
      const data = err.response?.data;
      if (data && data.reason === 'numero_orcamento') {
        setDuplicadoInfo(data);
        return;
      }
      const detail =
        data?.detail ||
        data?.responsavel?.[0] ||
        data?.data_prevista?.[0] ||
        data?.numero_orcamento?.[0] ||
        'Erro ao salvar tarefa.';
      setError(detail);
    }
  };

  const handleSubmitTask = (e) => {
    e.preventDefault();
    if (tarefaCriada) return;
    submeter();
  };

  const handleConfirmarDuplicado = () => {
    setDuplicadoInfo(null);
    submeter({ confirmar_orcamento_duplicado: true });
  };

  const handleAplicarSugestoes = (patch) => {
    if (!patch || typeof patch !== 'object') return;

    if (patch.origem === 'conversa') {
      if (patch.fluxo_sugerido) {
        const alvo = fluxos.find(
          (f) => f.nome.toLowerCase() === patch.fluxo_sugerido.toLowerCase()
        );
        if (alvo) setSelectedFluxo(String(alvo.id));
      }
      return;
    }

    if (patch.origem === 'pdf') {
      if (patch.fluxo_sugerido) {
        const alvoFluxo = fluxos.find(
          (f) => f.nome.toLowerCase() === patch.fluxo_sugerido.toLowerCase()
        );
        if (alvoFluxo) setSelectedFluxo(String(alvoFluxo.id));
      }
      if ('numero_orcamento' in patch) setNumeroOrcamento(patch.numero_orcamento || '');
      if ('validade_orcamento' in patch) setValidadeOrcamento(patch.validade_orcamento || '');
      if ('vl_produtos' in patch) setVlProdutos(patch.vl_produtos);
      if ('vl_desconto' in patch) setVlDesconto(patch.vl_desconto);
      if ('vl_icms_st' in patch) setVlIcmsSt(patch.vl_icms_st);
      if ('vl_total' in patch) setVlTotal(patch.vl_total);

      if (patch.arquivo) {
        if (task) {
          kanbanApi.uploadAnexo(task.id, patch.arquivo).catch(() => {
            setError('Falha ao anexar o PDF. Tente novamente em Editar.');
          });
        } else {
          setArquivosPendentes((prev) => {
            const ja = prev.some(
              (f) => f.name === patch.arquivo.name && f.size === patch.arquivo.size
            );
            return ja ? prev : [...prev, patch.arquivo];
          });
        }
      }

      const meta = patch._meta || {};
      const codigo = (meta.cliente_codigo || '').trim();
      const nome = (meta.cliente_nome || '').trim();
      const indeterminado = !nome || codigo === '000001';
      if (!indeterminado) {
        const existente = contatos.find(
          (c) => (c.nome || '').trim().toLowerCase() === nome.toLowerCase()
        );
        if (existente) {
          setSelectedContato(String(existente.id));
        } else {
          setClienteSugerido({ codigo, nome });
        }
      }
      return;
    }

    // Compatibilidade com patches antigos (sem origem).
    if ('numero_orcamento' in patch) setNumeroOrcamento(patch.numero_orcamento || '');
    if ('validade_orcamento' in patch) setValidadeOrcamento(patch.validade_orcamento || '');
    if ('vl_produtos' in patch) setVlProdutos(patch.vl_produtos);
    if ('vl_desconto' in patch) setVlDesconto(patch.vl_desconto);
    if ('vl_icms_st' in patch) setVlIcmsSt(patch.vl_icms_st);
    if ('vl_total' in patch) setVlTotal(patch.vl_total);
  };

  const handleCriarClienteSugerido = async () => {
    if (!clienteSugerido) return;
    const { nome } = clienteSugerido;
    try {
      const res = await kanbanApi.createContato({ nome });
      setContatos((prev) => [...prev, res.data]);
      setSelectedContato(String(res.data.id));
      setClienteSugerido(null);
    } catch (err) {
      const data = err.response?.data;
      if (data && data.existing) {
        setContatos((prev) => {
          const existe = prev.some(
            (c) => String(c.id) === String(data.existing.id)
          );
          return existe ? prev : [...prev, data.existing];
        });
        setSelectedContato(String(data.existing.id));
        setClienteSugerido(null);
      } else {
        setError(data?.detail || 'Erro ao criar contato a partir do PDF.');
      }
    }
  };

  return (
    <div
      style={{
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
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          maxWidth: '560px',
          width: '100%',
          margin: 'auto',
          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
          padding: '1.5rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.25rem',
            borderBottom: '1px solid #e5e7eb',
            paddingBottom: '0.75rem',
          }}
        >
          <h3 style={{ fontSize: '1.15rem', fontWeight: 'bold', margin: 0, color: '#111827' }}>
            {task ? 'Editar Tarefa' : (tarefaCriada ? 'Tarefa criada' : 'Nova Tarefa')}
          </h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: '0.75rem',
              backgroundColor: '#fee2e2',
              color: '#991b1b',
              borderRadius: '4px',
              marginBottom: '1rem',
              fontSize: '0.85rem',
            }}
          >
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
            Carregando dados...
          </div>
        ) : (
          <form onSubmit={handleSubmitTask}>
            <div style={{ marginBottom: '1rem' }}>
              <label
                htmlFor="task-fluxo"
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: '500',
                  marginBottom: '0.35rem',
                  color: '#374151',
                }}
              >
                Fluxo de Negociação
              </label>
              <select
                id="task-fluxo"
                value={selectedFluxo}
                onChange={(e) => setSelectedFluxo(e.target.value)}
                style={baseInput}
              >
                <option value="">[Nenhum / Tarefa Livre]</option>
                {fluxos.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nome}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.35rem',
                }}
              >
                <label
                  htmlFor="task-contato"
                  style={{ fontSize: '0.85rem', fontWeight: '500', color: '#374151' }}
                >
                  Contato
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewContact(!showNewContact);
                    setContactInfo('');
                    setContactError('');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#2563eb',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.2rem',
                  }}
                >
                  <Plus size={14} /> Novo
                </button>
              </div>

              {showNewContact ? (
                <div
                  style={{
                    padding: '0.75rem',
                    border: '1px dashed #3b82f6',
                    borderRadius: '6px',
                    backgroundColor: '#eff6ff',
                    marginBottom: '0.5rem',
                  }}
                >
                  <input
                    type="text"
                    placeholder="Digite Nome, E-mail ou Telefone *"
                    value={newContactInput}
                    onChange={(e) => setNewContactInput(e.target.value)}
                    style={{ ...baseInput, marginBottom: '0.5rem' }}
                  />
                  {contactError && (
                    <div
                      style={{ color: '#dc2626', fontSize: '0.75rem', marginBottom: '0.35rem' }}
                    >
                      {contactError}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={() => setShowNewContact(false)}
                      style={{
                        padding: '0.3rem 0.6rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        background: '#fff',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                      }}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveContact}
                      style={{
                        padding: '0.3rem 0.6rem',
                        border: 'none',
                        borderRadius: '4px',
                        background: '#2563eb',
                        color: '#fff',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                      }}
                    >
                      Salvar Contato
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ position: 'relative', marginBottom: '0.35rem' }}>
                    <Search
                      size={14}
                      style={{
                        position: 'absolute',
                        left: '0.5rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#9ca3af',
                      }}
                    />
                    <input
                      type="text"
                      placeholder="Buscar por nome, e-mail ou telefone..."
                      value={contactSearch}
                      onChange={(e) => setContactSearch(e.target.value)}
                      onKeyDown={handleSearchKeyDown}
                      style={{ ...baseInput, paddingLeft: '1.75rem' }}
                    />
                  </div>

                  {contactSearch.trim() && (
                    <div
                      aria-live="polite"
                      style={{
                        fontSize: '0.75rem',
                        color: contatosFiltrados.length === 0 ? '#dc2626' : '#6b7280',
                        marginBottom: '0.35rem',
                      }}
                    >
                      {contatosFiltrados.length === 0
                        ? 'Nenhum contato corresponde à busca.'
                        : contatosFiltrados.length === 1
                          ? '1 contato encontrado. Pressione Enter para selecioná-lo.'
                          : `${contatosFiltrados.length} contatos encontrados. Selecione abaixo.`}
                    </div>
                  )}

                  <select
                    id="task-contato"
                    value={selectedContato}
                    onChange={(e) => setSelectedContato(e.target.value)}
                    style={baseInput}
                  >
                    <option value="">[Sem Contato Definido]</option>
                    {contatosFiltrados.length === 0 && (
                      <option disabled value="__none__">
                        - Nenhum contato disponível -
                      </option>
                    )}
                    {contatosFiltrados.map((c) => {
                      const label = c.nome || c.email || c.telefone || `Contato #${c.id}`;
                      return (
                        <option key={c.id} value={c.id}>
                          {label}
                        </option>
                      );
                    })}
                  </select>

                  {contactInfo && (
                    <div
                      role="status"
                      aria-live="polite"
                      style={{
                        marginTop: '0.35rem',
                        padding: '0.4rem 0.6rem',
                        backgroundColor: '#d1fae5',
                        color: '#065f46',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                      }}
                    >
                      {contactInfo}
                    </div>
                  )}
                </>
              )}
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label
                htmlFor="task-responsavel"
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: '500',
                  marginBottom: '0.35rem',
                  color: '#374151',
                }}
              >
                Responsável
              </label>
              <select
                id="task-responsavel"
                value={selectedResponsavel}
                onChange={(e) => setSelectedResponsavel(e.target.value)}
                disabled={!canAssign}
                style={{
                  ...baseInput,
                  backgroundColor: canAssign ? '#ffffff' : '#f3f4f6',
                  color: canAssign ? '#111827' : '#4b5563',
                  cursor: canAssign ? 'pointer' : 'not-allowed',
                }}
              >
                {!task && <option value="">[Atribuir a mim mesmo]</option>}
                {task && !selectedResponsavel && <option value="">[Sem responsável]</option>}
                {usuarios.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.username} ({u.papel_display || u.papel})
                  </option>
                ))}
              </select>
              {!canAssign && (
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                  Apenas Subgerentes, Gerentes ou Administradores podem alterar o responsável.
                </div>
              )}
            </div>

            {responsavelAlterado && (
              <div style={{ marginBottom: '1rem' }}>
                <label
                  htmlFor="task-justificativa-responsavel"
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: '500',
                    marginBottom: '0.35rem',
                    color: '#374151',
                  }}
                >
                  Justificativa da reatribuição (opcional)
                </label>
                <textarea
                  id="task-justificativa-responsavel"
                  rows={2}
                  value={justificativaResponsavel}
                  onChange={(e) => setJustificativaResponsavel(e.target.value)}
                  placeholder="Motivo da mudança de responsável..."
                  style={{ ...baseInput, resize: 'vertical' }}
                />
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                  Este texto é registrado na trilha de auditoria da tarefa.
                </div>
              </div>
            )}

            <div style={{ marginBottom: '1rem' }}>
              <label
                htmlFor="task-data-prevista"
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: '500',
                  marginBottom: '0.35rem',
                  color: '#374151',
                }}
              >
                Data Prevista
              </label>
              <DatePickerBR
                id="task-data-prevista"
                value={dataPrevista}
                onChange={setDataPrevista}
                style={baseInput}
              />

              {dataAlterada && (
                <div
                  style={{
                    marginTop: '0.5rem',
                    padding: '0.5rem 0.75rem',
                    backgroundColor: '#fef3c7',
                    border: '1px solid #fcd34d',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    color: '#92400e',
                  }}
                >
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={registrarAdiada}
                      onChange={(e) => setRegistrarAdiada(e.target.checked)}
                    />
                    <span>
                      Registrar subtarefa "Tarefa adiada" para a nova data
                    </span>
                  </label>
                </div>
              )}
            </div>

            <EntradaAssistida onAplicarSugestoes={handleAplicarSugestoes} fluxos={fluxos} />

            <div style={{ marginTop: '1rem', marginBottom: '1rem' }}>
              <h4 style={{ fontSize: '0.9rem', margin: 0, marginBottom: '0.5rem', color: '#111827' }}>
                Orçamento
              </h4>

              <div style={{ marginBottom: '0.75rem' }}>
                <label
                  htmlFor="task-numero-orcamento"
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: '500',
                    marginBottom: '0.35rem',
                    color: '#374151',
                  }}
                >
                  Número do orçamento
                </label>
                <input
                  id="task-numero-orcamento"
                  type="text"
                  value={numeroOrcamento}
                  onChange={(e) => setNumeroOrcamento(e.target.value)}
                  placeholder="Ex.: 1234"
                  style={baseInput}
                />
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                <label
                  htmlFor="task-validade-orcamento"
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: '500',
                    marginBottom: '0.35rem',
                    color: '#374151',
                  }}
                >
                  Validade do orçamento
                </label>
                <DatePickerBR
                  id="task-validade-orcamento"
                  value={validadeOrcamento}
                  onChange={setValidadeOrcamento}
                  style={baseInput}
                />
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: '0.5rem',
                }}
              >
                <div>
                  <label
                    htmlFor="task-vl-produtos"
                    style={{
                      display: 'block',
                      fontSize: '0.8rem',
                      fontWeight: '500',
                      marginBottom: '0.25rem',
                      color: '#374151',
                    }}
                  >
                    Produtos (R$)
                  </label>
                  <input
                    id="task-vl-produtos"
                    type="text"
                    inputMode="decimal"
                    value={formatarValorInput(vlProdutos)}
                    onChange={(e) => setVlProdutos(parseValorInput(e.target.value))}
                    placeholder="0,00"
                    style={baseInput}
                  />
                </div>
                <div>
                  <label
                    htmlFor="task-vl-desconto"
                    style={{
                      display: 'block',
                      fontSize: '0.8rem',
                      fontWeight: '500',
                      marginBottom: '0.25rem',
                      color: '#374151',
                    }}
                  >
                    Desconto (R$)
                  </label>
                  <input
                    id="task-vl-desconto"
                    type="text"
                    inputMode="decimal"
                    value={formatarValorInput(vlDesconto)}
                    onChange={(e) => setVlDesconto(parseValorInput(e.target.value))}
                    placeholder="0,00"
                    style={baseInput}
                  />
                </div>
                <div>
                  <label
                    htmlFor="task-vl-icms-st"
                    style={{
                      display: 'block',
                      fontSize: '0.8rem',
                      fontWeight: '500',
                      marginBottom: '0.25rem',
                      color: '#374151',
                    }}
                  >
                    ICMS ST (R$)
                  </label>
                  <input
                    id="task-vl-icms-st"
                    type="text"
                    inputMode="decimal"
                    value={formatarValorInput(vlIcmsSt)}
                    onChange={(e) => setVlIcmsSt(parseValorInput(e.target.value))}
                    placeholder="0,00"
                    style={baseInput}
                  />
                </div>
                <div>
                  <label
                    htmlFor="task-vl-total"
                    style={{
                      display: 'block',
                      fontSize: '0.8rem',
                      fontWeight: '500',
                      marginBottom: '0.25rem',
                      color: '#374151',
                    }}
                  >
                    Total (R$)
                  </label>
                  <input
                    id="task-vl-total"
                    type="text"
                    inputMode="decimal"
                    value={formatarValorInput(vlTotal)}
                    onChange={(e) => setVlTotal(parseValorInput(e.target.value))}
                    placeholder="0,00"
                    style={baseInput}
                  />
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label
                htmlFor="task-observacoes"
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: '500',
                  marginBottom: '0.35rem',
                  color: '#374151',
                }}
              >
                Observações
              </label>
              <textarea
                id="task-observacoes"
                rows={3}
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Detalhes sobre a negociação..."
                style={baseInput}
              />
            </div>

            {(task || tarefaCriada) && (
              <div style={{ marginBottom: '1.25rem' }}>
                <AnexoManager
                  tarefaId={(task || tarefaCriada).id}
                  initialAnexos={(task || tarefaCriada).anexos || []}
                />
              </div>
            )}
            {!task && !tarefaCriada && (
              <div style={{ marginBottom: '1.25rem' }}>
                <AnexoManager
                  arquivosPendentes={arquivosPendentes}
                  onArquivosChange={setArquivosPendentes}
                />
              </div>
            )}

            {duplicadoInfo && (
              <div
                role="alertdialog"
                aria-label="Aviso de orçamento duplicado"
                style={{
                  border: '1px solid #f59e0b',
                  backgroundColor: '#fffbeb',
                  color: '#92400e',
                  borderRadius: '6px',
                  padding: '0.75rem',
                  marginBottom: '1rem',
                  fontSize: '0.85rem',
                }}
              >
                <p style={{ margin: 0, marginBottom: '0.5rem' }}>
                  <strong>Atenção:</strong> {duplicadoInfo.detail}
                </p>
                {duplicadoInfo.existing && (
                  <p style={{ margin: 0, marginBottom: '0.5rem', fontSize: '0.8rem' }}>
                    Tarefa existente: #{duplicadoInfo.existing.id} {duplicadoInfo.existing.titulo}
                  </p>
                )}
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setDuplicadoInfo(null)}
                    style={{
                      padding: '0.3rem 0.7rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      background: '#fff',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmarDuplicado}
                    style={{
                      padding: '0.3rem 0.7rem',
                      border: 'none',
                      borderRadius: '4px',
                      background: '#f59e0b',
                      color: '#fff',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    Confirmar mesmo assim
                  </button>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  background: '#f3f4f6',
                  color: '#374151',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              {tarefaCriada ? (
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '0.5rem 1rem',
                    border: 'none',
                    borderRadius: '4px',
                    background: '#2563eb',
                    color: '#ffffff',
                    fontWeight: '600',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                  }}
                >
                  Fechar
                </button>
              ) : (
                <button
                  type="submit"
                  style={{
                    padding: '0.5rem 1rem',
                    border: 'none',
                    borderRadius: '4px',
                    background: '#2563eb',
                    color: '#ffffff',
                    fontWeight: '600',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                  }}
                >
                  {task ? 'Salvar Alterações' : 'Criar Tarefa'}
                </button>
              )}
            </div>
            {clienteSugerido && (
              <div
                role="alertdialog"
                aria-label="Sugestão de novo contato"
                style={{
                  border: '1px solid #f59e0b',
                  backgroundColor: '#fffbeb',
                  color: '#92400e',
                  borderRadius: '6px',
                  padding: '0.75rem',
                  marginBottom: '1rem',
                  fontSize: '0.85rem',
                }}
              >
                <p style={{ margin: 0, marginBottom: '0.5rem' }}>
                  O PDF menciona o cliente <strong>{clienteSugerido.codigo} - {clienteSugerido.nome}</strong>,
                  mas ele não está cadastrado. Deseja criar um novo contato com este nome?
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setClienteSugerido(null)}
                    style={{
                      padding: '0.3rem 0.7rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      background: '#fff',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                    }}
                  >
                    Não, deixar em branco
                  </button>
                  <button
                    type="button"
                    onClick={handleCriarClienteSugerido}
                    style={{
                      padding: '0.3rem 0.7rem',
                      border: 'none',
                      borderRadius: '4px',
                      background: '#f59e0b',
                      color: '#fff',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    Sim, criar contato
                  </button>
                </div>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
};
