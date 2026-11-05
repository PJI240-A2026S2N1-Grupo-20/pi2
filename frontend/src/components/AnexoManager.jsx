import React, { useRef, useState } from 'react';
import { Paperclip, Trash2, Download, AlertCircle } from 'lucide-react';
import * as kanbanApi from '../api/kanbanApi';

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const MAX_ANEXOS = 20;

const formatBytes = (bytes) => {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

/**
 * Gerenciador de anexos em PDF.
 *
 * Dois modos de operacao:
 *  - Gerenciado (padrao): recebe tarefaId, faz upload imediato para
 *    POST /api/kanban/tarefas/{id}/anexos/ e permite remover via DELETE.
 *  - Staging: recebe arquivosPendentes + onArquivosChange. Apenas acumula
 *    File[] em memoria. O upload ocorre depois que a tarefa e criada.
 */
export const AnexoManager = ({
  tarefaId,
  initialAnexos = [],
  arquivosPendentes,
  onArquivosChange,
}) => {
  const isStaging = Array.isArray(arquivosPendentes);
  const [anexos, setAnexos] = useState(initialAnexos || []);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const total = isStaging ? arquivosPendentes.length : anexos.length;
  const limiteAtingido = total >= MAX_ANEXOS;

  const handlePickFile = () => fileInputRef.current?.click();

  const validarArquivo = (file) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return 'Apenas arquivos em formato PDF sao aceitos.';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'O arquivo excede o limite de 25 MB.';
    }
    if (total >= MAX_ANEXOS) {
      return 'Limite de 20 anexos por tarefa ja atingido.';
    }
    return null;
  };

  const handleUpload = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setError('');

    const msg = validarArquivo(file);
    if (msg) {
      setError(msg);
      e.target.value = '';
      return;
    }

    if (isStaging) {
      onArquivosChange([...arquivosPendentes, file]);
      e.target.value = '';
      return;
    }

    setUploading(true);
    try {
      const res = await kanbanApi.uploadAnexo(tarefaId, file);
      setAnexos((prev) => [...prev, res.data]);
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao enviar o anexo.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (item) => {
    setError('');
    if (isStaging) {
      const idx = arquivosPendentes.indexOf(item);
      if (idx >= 0) {
        const next = [...arquivosPendentes];
        next.splice(idx, 1);
        onArquivosChange(next);
      }
      return;
    }
    if (!window.confirm('Remover este anexo?')) return;
    try {
      await kanbanApi.deleteAnexo(tarefaId, item.id);
      setAnexos((prev) => prev.filter((a) => a.id !== item.id));
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao remover o anexo.');
    }
  };

  const itens = isStaging
    ? arquivosPendentes.map((f, i) => ({
        key: `pend-${i}-${f.name}`,
        nome: f.name,
        tamanho: f.size,
        url: null,
        raw: f,
      }))
    : anexos.map((a) => ({
        key: a.id,
        nome: a.nome,
        tamanho: a.tamanho,
        url: a.url,
        raw: a,
      }));

  const bloqueado = uploading || limiteAtingido;

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.35rem',
        }}
      >
        <label style={{ fontSize: '0.85rem', fontWeight: '500', color: '#374151' }}>
          Anexos em PDF ({total}/{MAX_ANEXOS})
        </label>
        <button
          type="button"
          onClick={handlePickFile}
          disabled={bloqueado}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            padding: '0.3rem 0.6rem',
            border: 'none',
            borderRadius: '4px',
            background: '#2563eb',
            color: '#ffffff',
            fontSize: '0.75rem',
            fontWeight: '600',
            cursor: bloqueado ? 'not-allowed' : 'pointer',
            opacity: bloqueado ? 0.6 : 1,
          }}
        >
          <Paperclip size={12} />
          {uploading ? 'Enviando...' : 'Adicionar PDF'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          onChange={handleUpload}
          aria-label="Selecionar arquivo PDF"
          style={{ display: 'none' }}
        />
      </div>

      {isStaging && (
        <p
          style={{
            fontSize: '0.72rem',
            color: '#6b7280',
            margin: '0 0 0.5rem 0',
            fontStyle: 'italic',
          }}
        >
          Os arquivos serao enviados automaticamente apos a criacao da tarefa.
        </p>
      )}

      {error && (
        <div
          role="alert"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            backgroundColor: '#fee2e2',
            color: '#991b1b',
            borderRadius: '4px',
            padding: '0.4rem 0.6rem',
            fontSize: '0.75rem',
            marginBottom: '0.5rem',
          }}
        >
          <AlertCircle size={12} /> {error}
        </div>
      )}

      {itens.length === 0 ? (
        <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: 0 }}>
          Nenhum anexo adicionado.
        </p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {itens.map((a) => (
            <li
              key={a.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.35rem',
                padding: '0.35rem 0.5rem',
                borderBottom: '1px solid #f3f4f6',
                fontSize: '0.8rem',
              }}
            >
              <span
                style={{
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  color: '#1f2937',
                }}
                title={a.nome}
              >
                {a.nome}
              </span>
              <span style={{ color: '#6b7280', fontSize: '0.7rem' }}>
                {formatBytes(a.tamanho)}
              </span>
              {a.url && (
                <a
                  href={a.url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Baixar ${a.nome}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    color: '#2563eb',
                    padding: '0.15rem',
                  }}
                >
                  <Download size={14} />
                </a>
              )}
              <button
                type="button"
                onClick={() => handleDelete(a.raw)}
                aria-label={`Remover ${a.nome}`}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#ef4444',
                  cursor: 'pointer',
                  padding: '0.15rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
