import React, { useState } from 'react';
import { ClipboardPaste, FileSearch, AlertCircle, CheckCircle } from 'lucide-react';
import {
  extrairSugestoesConversa,
  extrairSugestoesPdf,
  CAMPOS_LABEL,
  formatarValorCampo,
  NOME_FLUXO_ORCAMENTO,
} from '../utils/orcamentoParser';

const baseInput = {
  width: '100%',
  padding: '0.5rem',
  border: '1px solid #d1d5db',
  borderRadius: '4px',
  fontSize: '16px',
};

/**
 * Entrada assistida de tarefa (RF-24 e RF-25).
 *
 * Duas origens:
 *  - Conversa do WhatsApp: detecta palavras-chave e pré-seleciona o
 *    fluxo "Atendimento Comercial" quando a conversa trata de orçamento.
 *  - PDF de orçamento: extrai campos estruturados, mostra prévia e,
 *    ao aplicar, entrega o File para o modal anexar à tarefa.
 *
 * `onAplicarSugestoes(patch)` recebe:
 *  - { origem: 'conversa', fluxo_sugerido }
 *  - { origem: 'pdf', arquivo, ...campos, _meta }
 */
export const EntradaAssistida = ({ onAplicarSugestoes, fluxos = [] }) => {
  const [texto, setTexto] = useState('');
  const [sugestoesPdf, setSugestoesPdf] = useState(null);
  const [arquivoPdf, setArquivoPdf] = useState(null);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [lendoPdf, setLendoPdf] = useState(false);

  const limpar = () => {
    setSugestoesPdf(null);
    setArquivoPdf(null);
    setErro('');
    setAviso('');
  };

  const handleExtrairConversa = () => {
    limpar();
    if (!texto.trim()) {
      setErro('Cole o texto da conversa antes de extrair.');
      return;
    }

    const { sugestoes, meta } = extrairSugestoesConversa(texto);

    if (!sugestoes.fluxo_sugerido) {
      setAviso('Nenhuma palavra-chave de orçamento foi encontrada na conversa.');
      return;
    }

    const alvo = fluxos.find(
      (f) => f.nome.toLowerCase() === NOME_FLUXO_ORCAMENTO.toLowerCase()
    );

    if (alvo) {
      onAplicarSugestoes({
        origem: 'conversa',
        fluxo_sugerido: sugestoes.fluxo_sugerido,
      });
      const kws = meta.palavras_encontradas.join(', ');
      setAviso(
        `Fluxo "${alvo.nome}" selecionado automaticamente ` +
        `(palavras-chave: ${kws}).`
      );
    } else {
      setAviso(
        `Conversa parece ser de orçamento (palavras-chave: ` +
        `${meta.palavras_encontradas.join(', ')}), mas o fluxo ` +
        `"${NOME_FLUXO_ORCAMENTO}" não está cadastrado. ` +
        'Selecione o fluxo manualmente.'
      );
    }
  };

  const handleExtrairPdf = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    limpar();
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setErro('Selecione um arquivo em formato PDF.');
      e.target.value = '';
      return;
    }
    setLendoPdf(true);
    try {
      const { lerTextoPdf } = await import('../utils/pdfTexto');
      const textoPdf = await lerTextoPdf(file);
      // DEBUG temporario - remover quando a extracao estiver calibrada
      if (!textoPdf || textoPdf.trim().length < 5) {
        setErro(
          'Não foi possível extrair texto do PDF. ' +
          'Se o arquivo for escaneado, cole o conteúdo manualmente.'
        );
        return;
      }
      const { sugestoes } = extrairSugestoesPdf(textoPdf);
      const campos = Object.keys(sugestoes).filter(
        (k) => k !== '_meta'
      );
      if (campos.length === 0) {
        setErro('Nenhum campo do orçamento foi reconhecido no PDF.');
        return;
      }
      setSugestoesPdf(sugestoes);
      setArquivoPdf(file);
    } catch (err) {
      setErro('Falha ao ler o PDF. Verifique o arquivo e tente novamente.');
    } finally {
      setLendoPdf(false);
      e.target.value = '';
    }
  };

  const handleAplicarTodos = () => {
    if (!arquivoPdf || !sugestoesPdf) return;

    const { _meta, ...campos } = sugestoesPdf;
    onAplicarSugestoes({
      origem: 'pdf',
      arquivo: arquivoPdf,
      ...campos,
      fluxo_sugerido: sugestoesPdf.fluxo_sugerido,
      _meta,
    });

    setSugestoesPdf(null);
    setArquivoPdf(null);
    setAviso(
      'Campos do PDF aplicados. O arquivo será anexado automaticamente ' +
      'ao salvar a tarefa.'
    );
  };

  const camposPreview = sugestoesPdf
    ? Object.keys(sugestoesPdf).filter((k) => k !== '_meta')
    : [];

  const meta = sugestoesPdf && sugestoesPdf._meta ? sugestoesPdf._meta : {};

  return (
    <section
      aria-label="Entrada assistida de orçamento"
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: '6px',
        padding: '0.75rem',
        backgroundColor: '#f9fafb',
      }}
    >
      <h4 style={{ fontSize: '0.9rem', margin: 0, marginBottom: '0.5rem', color: '#111827' }}>
        Entrada assistida de orçamento
      </h4>
      <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0 0 0.75rem 0' }}>
        Cole a conversa do WhatsApp (para pré-selecionar o fluxo) ou
        selecione o PDF do orçamento (para preencher os campos da tarefa).
      </p>

      <label
        htmlFor="entrada-conversa"
        style={{
          display: 'block',
          fontSize: '0.8rem',
          fontWeight: '500',
          color: '#374151',
          marginBottom: '0.25rem',
        }}
      >
        Conversa do WhatsApp
      </label>
      <textarea
        id="entrada-conversa"
        rows={3}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Cole aqui a conversa com o cliente..."
        style={{ ...baseInput, resize: 'vertical', marginBottom: '0.5rem' }}
      />

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
        <button
          type="button"
          onClick={handleExtrairConversa}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem',
            padding: '0.4rem 0.75rem',
            border: 'none',
            borderRadius: '4px',
            background: '#2563eb',
            color: '#fff',
            fontSize: '0.8rem',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          <ClipboardPaste size={14} /> Analisar conversa
        </button>

        <label
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem',
            padding: '0.4rem 0.75rem',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            background: '#fff',
            color: '#374151',
            fontSize: '0.8rem',
            fontWeight: '600',
            cursor: lendoPdf ? 'not-allowed' : 'pointer',
            opacity: lendoPdf ? 0.6 : 1,
          }}
        >
          <FileSearch size={14} />
          {lendoPdf ? 'Lendo PDF...' : 'Extrair do PDF'}
          <input
            type="file"
            accept="application/pdf,.pdf"
            aria-label="Selecionar PDF do orçamento para extração"
            onChange={handleExtrairPdf}
            disabled={lendoPdf}
            style={{ display: 'none' }}
          />
        </label>
      </div>

      {erro && (
        <div
          role="alert"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.4rem 0.6rem',
            backgroundColor: '#fee2e2',
            color: '#991b1b',
            borderRadius: '4px',
            fontSize: '0.75rem',
            marginBottom: '0.5rem',
          }}
        >
          <AlertCircle size={12} /> {erro}
        </div>
      )}

      {aviso && (
        <p
          aria-live="polite"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.75rem',
            color: '#065f46',
            backgroundColor: '#d1fae5',
            padding: '0.4rem 0.6rem',
            borderRadius: '4px',
            margin: '0 0 0.5rem 0',
          }}
        >
          <CheckCircle size={12} /> {aviso}
        </p>
      )}

      {camposPreview.length > 0 && (
        <div
          role="region"
          aria-label="Prévia dos campos extraídos"
          style={{
            border: '1px solid #bfdbfe',
            backgroundColor: '#eff6ff',
            borderRadius: '4px',
            padding: '0.5rem',
            marginTop: '0.5rem',
          }}
        >
          <p style={{ fontSize: '0.8rem', fontWeight: '600', color: '#1e40af', margin: '0 0 0.35rem 0' }}>
            Campos reconhecidos
          </p>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.2rem' }}>
            {camposPreview.map((campo) => (
              <li
                key={campo}
                data-testid={`previa-${campo}`}
                style={{ fontSize: '0.78rem', color: '#374151' }}
              >
                <strong>{CAMPOS_LABEL[campo] || campo}:</strong>{' '}
                {formatarValorCampo(campo, sugestoesPdf[campo])}
              </li>
            ))}
            {meta.cliente_nome && (
              <li data-testid="previa-cliente" style={{ fontSize: '0.78rem', color: '#374151' }}>
                <strong>Cliente:</strong>{' '}
                {meta.cliente_codigo} - {meta.cliente_nome}
              </li>
            )}
          </ul>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={limpar}
              style={{
                padding: '0.3rem 0.6rem',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                background: '#fff',
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              Descartar
            </button>
            <button
              type="button"
              onClick={handleAplicarTodos}
              style={{
                padding: '0.3rem 0.7rem',
                border: 'none',
                borderRadius: '4px',
                background: '#2563eb',
                color: '#fff',
                fontSize: '0.8rem',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Aplicar todos
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
