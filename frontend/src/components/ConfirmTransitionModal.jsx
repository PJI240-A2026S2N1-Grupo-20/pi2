import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { getTaskTitle, ESTADO_LABEL } from '../utils/kanbanUtils';

/**
 * Modal de confirmação para transições sensíveis (RN-04) e definição de data (RN-09):
 *  - type === 'concluir':            seleciona resultado (Concluída/Cancelada)
 *  - type === 'voltar_pendencias':   avisa que a Data Prevista será removida
 *  - type === 'reabrir':             exige destino, data prevista e justificativa
 *  - type === 'definir_data':        exige data prevista para mover de Pendências
 *
 * Todos os <label> possuem htmlFor e todos os controles possuem id,
 * permitindo associação programática (RNF-01 e testes com getByLabelText).
 */
export const ConfirmTransitionModal = ({ transition, onCancel, onConfirm }) => {
  const { type, task } = transition || {};
  const title = getTaskTitle(task || {});

  const existingResult = task?.subtarefas?.find((s) => s.tipo === 'resultado');
  const [resultado, setResultado] = useState(existingResult?.opcao_selecionada || '');
  const [destino, setDestino] = useState(transition?.destino || 'a_fazer');
  const [dataPrevista, setDataPrevista] = useState(task?.data_prevista || '');
  const [justificativa, setJustificativa] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = () => {
    setError('');
    if (type === 'concluir') {
      if (!resultado) {
        setError('Selecione uma opção de resultado antes de concluir.');
        return;
      }
      onConfirm({ resultado });
    } else if (type === 'voltar_pendencias') {
      onConfirm({});
    } else if (type === 'reabrir') {
      if (!justificativa.trim()) {
        setError('A justificativa é obrigatória.');
        return;
      }
      if (!dataPrevista) {
        setError('Informe uma Data Prevista para reabrir a tarefa.');
        return;
      }
      onConfirm({
        destino,
        data_prevista: dataPrevista,
        justificativa: justificativa.trim(),
      });
    } else if (type === 'definir_data') {
      if (!dataPrevista) {
        setError('Informe uma Data Prevista para continuar.');
        return;
      }
      onConfirm({ data_prevista: dataPrevista });
    }
  };

  const renderContent = () => {
    if (type === 'concluir') {
      return (
        <>
          <p style={{ fontSize: '0.9rem', color: '#374151', marginBottom: '0.75rem' }}>
            Para concluir a tarefa <strong>{title}</strong>, selecione o resultado:
          </p>
          <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '0.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', fontSize: '0.9rem' }}>
              <input
                type="radio"
                name="resultado"
                value="Concluída"
                checked={resultado === 'Concluída'}
                onChange={(e) => setResultado(e.target.value)}
              />
              Concluída
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', fontSize: '0.9rem' }}>
              <input
                type="radio"
                name="resultado"
                value="Cancelada"
                checked={resultado === 'Cancelada'}
                onChange={(e) => setResultado(e.target.value)}
              />
              Cancelada
            </label>
          </div>
        </>
      );
    }
    if (type === 'voltar_pendencias') {
      return (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#b45309', marginBottom: '0.75rem' }}>
            <AlertTriangle size={20} />
            <strong>Atenção</strong>
          </div>
          <p style={{ fontSize: '0.9rem', color: '#374151', margin: 0 }}>
            Ao mover <strong>{title}</strong> de volta para <strong>Pendências</strong>, a Data Prevista será removida.
          </p>
        </>
      );
    }
    if (type === 'reabrir') {
      return (
        <>
          <p style={{ fontSize: '0.9rem', color: '#374151', marginBottom: '0.75rem' }}>
            Reabrir a tarefa <strong>{title}</strong>:
          </p>

          <div style={{ marginBottom: '0.75rem' }}>
            <label
              htmlFor="reabrir-destino"
              style={{ display: 'block', fontSize: '0.85rem', fontWeight: '500', marginBottom: '0.35rem', color: '#374151' }}
            >
              Destino
            </label>
            <select
              id="reabrir-destino"
              value={destino}
              onChange={(e) => setDestino(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '16px' }}
            >
              <option value="a_fazer">A fazer</option>
              <option value="em_andamento">Em andamento</option>
            </select>
          </div>

          <div style={{ marginBottom: '0.75rem' }}>
            <label
              htmlFor="reabrir-data-prevista"
              style={{ display: 'block', fontSize: '0.85rem', fontWeight: '500', marginBottom: '0.35rem', color: '#374151' }}
            >
              Data Prevista *
            </label>
            <input
              id="reabrir-data-prevista"
              type="date"
              value={dataPrevista}
              onChange={(e) => setDataPrevista(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '16px' }}
            />
          </div>

          <div style={{ marginBottom: '0.75rem' }}>
            <label
              htmlFor="reabrir-justificativa"
              style={{ display: 'block', fontSize: '0.85rem', fontWeight: '500', marginBottom: '0.35rem', color: '#374151' }}
            >
              Justificativa *
            </label>
            <textarea
              id="reabrir-justificativa"
              rows={3}
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder="Motivo da reabertura..."
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '16px', resize: 'vertical' }}
            />
          </div>
        </>
      );
    }
    if (type === 'definir_data') {
      const destinoLabel = ESTADO_LABEL[transition?.destino] || transition?.destino;
      return (
        <>
          <p style={{ fontSize: '0.9rem', color: '#374151', marginBottom: '0.75rem' }}>
            Para mover <strong>{title}</strong> para <strong>{destinoLabel}</strong>, é necessário definir uma Data Prevista.
          </p>
          <div style={{ marginBottom: '0.75rem' }}>
            <label
              htmlFor="definir-data-prevista"
              style={{ display: 'block', fontSize: '0.85rem', fontWeight: '500', marginBottom: '0.35rem', color: '#374151' }}
            >
              Data Prevista *
            </label>
            <input
              id="definir-data-prevista"
              type="date"
              value={dataPrevista}
              onChange={(e) => setDataPrevista(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '16px' }}
            />
          </div>
        </>
      );
    }
    return null;
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      zIndex: 1100, padding: '1rem',
    }}>
      <div style={{
        backgroundColor: '#ffffff', borderRadius: '8px',
        maxWidth: '480px', width: '100%',
        padding: '1.25rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.15)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.75rem' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 'bold', color: '#111827' }}>
            {type === 'concluir' && 'Confirmar Conclusão'}
            {type === 'voltar_pendencias' && 'Confirmação'}
            {type === 'reabrir' && 'Reabrir Tarefa'}
            {type === 'definir_data' && 'Definir Data Prevista'}
          </h3>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }} aria-label="Fechar">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div role="alert" style={{ padding: '0.75rem', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '4px', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}

        {renderContent()}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{ padding: '0.5rem 1rem', border: '1px solid #d1d5db', borderRadius: '4px', background: '#f3f4f6', color: '#374151', fontSize: '0.85rem', cursor: 'pointer' }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            style={{ padding: '0.5rem 1rem', border: 'none', borderRadius: '4px', background: '#2563eb', color: '#ffffff', fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer' }}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
};
