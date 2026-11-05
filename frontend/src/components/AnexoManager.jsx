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

export const AnexoManager = ({ tarefaId, initialAnexos = [] }) => {
  const [anexos, setAnexos] = useState(initialAnexos || []);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handlePickFile = () => fileInputRef.current?.click();

  const handleUpload = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setError('');

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Apenas arquivos em formato PDF sao aceitos.');
      e.target.value = '';
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('O arquivo excede o limite de 25 MB.');
      e.target.value = '';
      return;
    }
    if (anexos.length >= MAX_ANEXOS) {
      setError('Limite de 20 anexos por tarefa ja atingido.');
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

  const handleDelete = async (anexoId) => {
    if (!window.confirm('Remover este anexo?')) return;
    setError('');
    try {
      await kanbanApi.deleteAnexo(tarefaId, anexoId);
      setAnexos((prev) => prev.filter((a) => a.id !== anexoId));
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao remover o anexo.');
    }
  };

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
          Anexos em PDF ({anexos.length}/{MAX_ANEXOS})
        </label>
        <button
          type="button"
          onClick={handlePickFile}
          disabled={uploading || anexos.length >= MAX_ANEXOS}
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
            cursor: uploading || anexos.length >= MAX_ANEXOS ? 'not-allowed' : 'pointer',
            opacity: uploading || anexos.length >= MAX_ANEXOS ? 0.6 : 1,
          }}
        >
          <Paperclip size={12} /> {uploading ? 'Enviando...' : 'Adicionar PDF'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          onChange={handleUpload}
          style={{ display: 'none' }}
        />
      </div>

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

      {anexos.length === 0 ? (
        <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: 0 }}>
          Nenhum anexo adicionado.
        </p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {anexos.map((a) => (
            <li
              key={a.id}
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
                  style={{ display: 'inline-flex', alignItems: 'center', color: '#2563eb', padding: '0.15rem' }}
                >
                  <Download size={14} />
                </a>
              )}
              <button
                type="button"
                onClick={() => handleDelete(a.id)}
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
