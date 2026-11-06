/**
 * Parser de entrada assistida (RF-24 e RF-25).
 *
 * Duas origens suportadas:
 *  - Conversa do WhatsApp: detecta palavras-chave e sugere fluxo.
 *  - PDF de orçamento: extrai campos estruturados do formato ELETROREDE.
 */

export const PALAVRAS_CHAVE_ORCAMENTO = [
  'orçamento', 'orcamento',
  'cotação', 'cotacao',
  'preço', 'preco',
  'quanto custa',
  'proposta comercial',
  'proposta de preço',
  'proposta de preco',
];

export const NOME_FLUXO_ORCAMENTO = 'Atendimento Comercial';

const RE_DINHEIRO = /([\d.]+,\d{1,2})/g;
const RE_DATA_BR = /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g;
const RE_TELEFONE = /(?:\+?55[\s-]?)?\(?\d{2}\)?[\s-]?\d{4,5}[\s-]?\d{4}/g;

export const CAMPOS_LABEL = {
  numero_orcamento: 'Número do orçamento',
  validade_orcamento: 'Validade',
  vl_produtos: 'Valor dos produtos',
  vl_desconto: 'Desconto',
  vl_icms_st: 'ICMS ST',
  vl_total: 'Valor total',
  cliente_nome: 'Cliente',
};

const CAMPOS_MONETARIOS = new Set([
  'vl_produtos', 'vl_desconto', 'vl_icms_st', 'vl_total',
]);

export function formatarValorExibicao(valor) {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return '';
  return Number(valor).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatarDataExibicao(iso) {
  if (!iso) return '';
  const partes = String(iso).split('-');
  if (partes.length !== 3) return String(iso);
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

export function formatarValorCampo(campo, valor) {
  if (valor === null || valor === undefined || valor === '') return '';
  if (CAMPOS_MONETARIOS.has(campo)) return formatarValorExibicao(valor);
  if (campo === 'validade_orcamento') return formatarDataExibicao(valor);
  return String(valor);
}

export function parseValorBR(texto) {
  if (!texto) return null;
  const s = String(texto).trim();
  if (s.includes(',')) {
    const n = parseFloat(s.replace(/\./g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }
  const partes = s.split('.');
  if (partes.length === 2 && partes[1].length <= 2) {
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : null;
  }
  const n = parseFloat(s.replace(/\./g, ''));
  return Number.isFinite(n) ? n : null;
}

export function normalizarData(dia, mes, ano) {
  const d = parseInt(dia, 10);
  const m = parseInt(mes, 10);
  let a = parseInt(ano, 10);
  if (String(ano).length === 2) a += 2000;
  if (!d || !m || !a) return null;
  if (d < 1 || d > 31 || m < 1 || m > 12) return null;
  return (
    String(a).padStart(4, '0') + '-' +
    String(m).padStart(2, '0') + '-' +
    String(d).padStart(2, '0')
  );
}

/**
 * RF-24: análise de uma conversa do WhatsApp.
 *
 * Retorna `sugestoes.fluxo_sugerido` quando ao menos uma palavra-chave
 * relacionada a orçamento aparece no texto. Retorna também telefones
 * e datas detectados em `meta`, úteis para conferência manual.
 *
 * @param {string} texto
 * @returns {{ sugestoes: object, meta: object }}
 */
export function extrairSugestoesConversa(texto) {
  const sugestoes = {};
  const meta = { palavras_encontradas: [], telefones: [], datas: [] };

  if (!texto || typeof texto !== 'string') {
    return { sugestoes, meta };
  }

  const textoLower = texto.toLowerCase();

  for (const kw of PALAVRAS_CHAVE_ORCAMENTO) {
    if (textoLower.includes(kw) && !meta.palavras_encontradas.includes(kw)) {
      meta.palavras_encontradas.push(kw);
    }
  }

  for (const m of texto.matchAll(RE_TELEFONE)) {
    const t = m[0].trim();
    if (t) meta.telefones.push(t);
  }

  for (const m of texto.matchAll(RE_DATA_BR)) {
    const iso = normalizarData(m[1], m[2], m[3]);
    if (iso) meta.datas.push(iso);
  }

  if (meta.palavras_encontradas.length > 0) {
    sugestoes.fluxo_sugerido = NOME_FLUXO_ORCAMENTO;
  }

  return { sugestoes, meta };
}

/**
 * RF-25: extração a partir do texto de um PDF de orçamento.
 *
 * Reconhece o layout ELETROREDE (cabeçalho com Nº, Emissão,
 * Vendedor, Cliente, VI.Produtos/Desconto/ICMS ST/Total e cláusula
 * de validade). Campos ausentes ficam de fora de `sugestoes`.
 *
 * Dados auxiliares (emissão, código e nome do vendedor, código e
 * nome do cliente) vão em `sugestoes._meta`, com prefixo `_` para
 * não colidir com campos do modelo.
 *
 * @param {string} texto
 * @returns {{ sugestoes: object, meta: object }}
 */
export function limparNomeCliente(raw) {
  if (!raw) return '';
  let nome = String(raw).replace(/\s+/g, ' ').trim();

  const truncadores = [
    /\s+Cliente\s*(?:\.{2,}|:)/i,
    /\s+CNPJ\b/i,
    /\s+CPF\b/i,
    /\s+Endere/i,
    /\s+Insc\.?\s*Est/i,
    /\s+CEP\b/i,
    /\s+E-?mail\b/i,
    /\s+Bairro\b/i,
    /\s+FONE\b/i,
    /\s+Telefone\b/i,
    /\s+Celular\b/i,
    /\s+Forma\s*[:.]/i,
    /\s+Condi[çc][ãa]o\s*[:.]/i,
    /\s+C[óo]digo\b/i,
    /\s+Descri[çc][ãa]o\b/i,
  ];

  for (const t of truncadores) {
    const m = nome.match(t);
    if (m && m.index > 0) {
      nome = nome.slice(0, m.index);
    }
  }

  if (nome.length > 100) {
    const idx = nome.lastIndexOf(' ', 100);
    nome = nome.slice(0, idx > 20 ? idx : 100);
  }

  return nome.trim();
}

export function extrairSugestoesPdf(texto) {
  const sugestoes = {};
  const meta = {};

  if (!texto || typeof texto !== 'string') {
    return { sugestoes, meta };
  }

  // Normaliza espaços, NBSP, zero-width e quebras de linha.
  const limpo = texto
    .replace(/[\u00a0\u200b\u200d\u2060\ufeff]/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\r\n?/g, '\n');

  // Número do orçamento: aceita Nº/N° (símbolo ordinal) ou No. (abreviação
  // com ponto final). Não aceita 'NO' dentro de palavras como MANOEL.
  const labelNum = /(?:N\s*[º°]|\bNo\.)\s*[:.\-]?/i;

  // 1) Padrão 'Nº: 473528' (rótulo primeiro, número depois).
  const mApos = limpo.match(
    new RegExp(labelNum.source + '\\s*(\\d{4,})(?![\\d\\/:])', 'i')
  );
  if (mApos) {
    sugestoes.numero_orcamento = mApos[1];
  } else {
    // 2) Padrão '473528 Nº:' (pdfjs às vezes inverte a ordem).
    const mAntes = limpo.match(
      new RegExp('(?<![\\d\\/:])(\\d{4,})\\s*' + labelNum.source, 'i')
    );
    if (mAntes) {
      sugestoes.numero_orcamento = mAntes[1];
    }
  }

  // Emissão
  const mEmissao = limpo.match(
    /Emiss[ãa]o\s*[:.\-]?\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/i
  );
  if (mEmissao) {
    const iso = normalizarData(mEmissao[1], mEmissao[2], mEmissao[3]);
    if (iso) meta.emissao = iso;
  }

  // Vendedor
  const mVend = limpo.match(
    /Vendedor\s*[:.\-]?\s*(\d+)\s*[-\u2013\u2014]\s*([A-ZÀ-Ú][^\n\r]{2,}?)(?=\s*P[ÁA]GINA|\n|$)/i
  );
  if (mVend) {
    meta.vendedor_codigo = mVend[1].trim();
    meta.vendedor_nome = mVend[2].trim();
  }

  // Cliente - múltiplas estratégias de extração.
  const extrairCliente = () => {
    // 1) Linha por linha: robusto contra quebras e fragmentos do pdfjs.
    const linhas = limpo.split('\n');
    for (const linha of linhas) {
      if (!/Cliente\b/i.test(linha)) continue;
      const semPrefixo = linha.replace(
        /^\s*Cliente\.*\s*[:.\-]?\s*/i,
        ''
      );
      const m1 = semPrefixo.match(/^(\d+)\s*[-\u2013\u2014]\s*(.+)$/);
      if (m1) {
        return {
          codigo: m1[1].trim(),
          nome: m1[2].trim().replace(/[.\s]+$/, ''),
        };
      }
      const m2 = semPrefixo.match(/^(\d+)/);
      if (m2) {
        return { codigo: m2[1].trim(), nome: '' };
      }
    }

    // 2) Fallback: busca no texto inteiro.
    const m = limpo.match(
      /Cliente\.*\s*[:.\-]?\s*(\d+)\s*[-\u2013\u2014]\s*([^\n\r]*?)(?=\s*Endere|\n|$)/i
    );
    if (m) {
      return { codigo: m[1].trim(), nome: (m[2] || '').trim() };
    }

    return null;
  };

  const clienteExtraido = extrairCliente();
  if (clienteExtraido) {
    meta.cliente_codigo = clienteExtraido.codigo;
    meta.cliente_nome = limparNomeCliente(clienteExtraido.nome || '');
  }

  // Valores: exige formato BR (com vírgula). Isso evita casar com
  // "VI.Total12474" do cabeçalho de tabela (12474 não tem vírgula).
  const extrairValor = (rotulo) => {
    const r1 = new RegExp(
      `V\\s*[IÍiLl1]?\\s*\\.?\\s*${rotulo}\\s*[:.\\-]?\\s*([\\d.]+,\\d{1,2})`,
      'i'
    );
    const m1 = limpo.match(r1);
    if (m1) return parseValorBR(m1[1]);

    const r2 = new RegExp(
      `${rotulo}\\s*[:.\\-]?\\s*([\\d.]+,\\d{1,2})`,
      'i'
    );
    const m2 = limpo.match(r2);
    if (m2) return parseValorBR(m2[1]);

    return null;
  };

  const vlProdutos = extrairValor('Produtos?');
  if (vlProdutos !== null) sugestoes.vl_produtos = vlProdutos;

  const vlDesconto = extrairValor('Desconto');
  if (vlDesconto !== null) sugestoes.vl_desconto = vlDesconto;

  const vlIcmsSt = extrairValor('ICMS\\s*ST');
  if (vlIcmsSt !== null) sugestoes.vl_icms_st = vlIcmsSt;

  const vlTotal = extrairValor('Total');
  if (vlTotal !== null) sugestoes.vl_total = vlTotal;

  // Validade
  const mVal = limpo.match(
    /V[ÁA]LIDOS?\s+AT[ÉE]\s+(\d{1,2})\/(\d{1,2})\/(\d{4})/i
  );
  if (mVal) {
    const iso = normalizarData(mVal[1], mVal[2], mVal[3]);
    if (iso) sugestoes.validade_orcamento = iso;
  }

  // Se algum campo de orçamento foi reconhecido, ou se o texto menciona
  // "orçamento", sugere o fluxo comercial.
  const algumCampo =
    sugestoes.numero_orcamento ||
    sugestoes.validade_orcamento ||
    sugestoes.vl_produtos !== undefined ||
    sugestoes.vl_desconto !== undefined ||
    sugestoes.vl_icms_st !== undefined ||
    sugestoes.vl_total !== undefined;

  if (algumCampo || /or[çc]amento/i.test(limpo)) {
    sugestoes.fluxo_sugerido = NOME_FLUXO_ORCAMENTO;
  }

  if (Object.keys(meta).length > 0) {
    sugestoes._meta = meta;
  }

  return { sugestoes, meta };
}
