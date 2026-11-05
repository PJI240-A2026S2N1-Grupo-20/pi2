import { describe, test, expect } from 'vitest';
import {
  extrairSugestoesConversa,
  extrairSugestoesPdf,
  parseValorBR,
  normalizarData,
  formatarValorExibicao,
  NOME_FLUXO_ORCAMENTO,
} from '../orcamentoParser';

const TEXTO_PDF_UMA_PAGINA = `
Nº: 473528 Emissão: 26/08/2026 12:26:54 Vendedor: 086 - GUILHERME SANCTI PÁGINA: 1
Cliente....: 000001 -
Endereço:
VI.Produtos: 113,59 VI.Desconto: 0,00 VI.ICMS ST: 0,00 VI.Total: 113,59
OS PREÇOS, QUANTIDADES E CONDIÇÕES DESTE ORÇAMENTO SÃO VÁLIDOS ATÉ 27/08/2026
`;

const TEXTO_PDF_MULTI_PAGINA = `
35 35 35 35 35 15:02:59 086 - GUILHERME SANCTI PÁGINA: 1
Cliente..... 000001 -
Endereço:
Emissão: 05/11/2026 15:02:59 Vendedor: 086 - GUILHERME SANCTI PÁGINA: 2
Nº: 487716
VI.Produtos: 5.447,22 VI.Desconto: 0,00 VI.ICMS ST: 0,00 VI.Total: 5.447,22
OS PREÇOS, QUANTIDADES E CONDIÇÕES DESTE ORÇAMENTO SÃO VÁLIDOS ATÉ 27/11/2026
`;

describe('orcamentoParser - RF-24 e RF-25', () => {
  describe('extrairSugestoesConversa (RF-24)', () => {
    test('detecta palavra-chave orçamento e sugere fluxo comercial', () => {
      const { sugestoes, meta } = extrairSugestoesConversa(
        'Boa tarde! Segue o orçamento solicitado.'
      );
      expect(sugestoes.fluxo_sugerido).toBe(NOME_FLUXO_ORCAMENTO);
      expect(meta.palavras_encontradas).toContain('orçamento');
    });

    test('detecta cotação e preço', () => {
      const { sugestoes } = extrairSugestoesConversa(
        'Preciso de uma cotação, qual o preço do cabo 2,5mm?'
      );
      expect(sugestoes.fluxo_sugerido).toBe(NOME_FLUXO_ORCAMENTO);
    });

    test('retorna vazio quando não há palavra-chave', () => {
      const { sugestoes, meta } = extrairSugestoesConversa(
        'Bom dia, tudo bem? Você está disponível amanhã?'
      );
      expect(sugestoes.fluxo_sugerido).toBeUndefined();
      expect(meta.palavras_encontradas).toHaveLength(0);
    });

    test('extrai telefones e datas detectados', () => {
      const { meta } = extrairSugestoesConversa(
        'Orçamento pra amanhã 05/11/2026. Meu número é (18) 99999-8888.'
      );
      expect(meta.datas).toContain('2026-11-05');
      expect(meta.telefones.length).toBeGreaterThan(0);
    });

    test('retorna estrutura vazia para entrada invalida', () => {
      const r = extrairSugestoesConversa(null);
      expect(r.sugestoes).toEqual({});
      expect(r.meta.palavras_encontradas).toEqual([]);
    });
  });

  describe('extrairSugestoesPdf (RF-25)', () => {
    test('extrai campos do PDF de página única (ELETROREDE)', () => {
      const { sugestoes } = extrairSugestoesPdf(TEXTO_PDF_UMA_PAGINA);
      expect(sugestoes.numero_orcamento).toBe('473528');
      expect(sugestoes.validade_orcamento).toBe('2026-08-27');
      expect(sugestoes.vl_produtos).toBe(113.59);
      expect(sugestoes.vl_desconto).toBe(0);
      expect(sugestoes.vl_icms_st).toBe(0);
      expect(sugestoes.vl_total).toBe(113.59);
    });

    test('extrai campos do PDF multi-página (cabeçalho na página 2)', () => {
      const { sugestoes } = extrairSugestoesPdf(TEXTO_PDF_MULTI_PAGINA);
      expect(sugestoes.numero_orcamento).toBe('487716');
      expect(sugestoes.validade_orcamento).toBe('2026-11-27');
      expect(sugestoes.vl_total).toBe(5447.22);
    });

    test('cliente indeterminado tem nome vazio', () => {
      const { sugestoes } = extrairSugestoesPdf(TEXTO_PDF_UMA_PAGINA);
      expect(sugestoes._meta.cliente_codigo).toBe('000001');
      expect(sugestoes._meta.cliente_nome).toBe('');
    });

    test('cliente nomeado é extraído', () => {
      const texto = 'Cliente....: 123456 - JOAO DA SILVA\nEndereço: Rua X';
      const { sugestoes } = extrairSugestoesPdf(texto);
      expect(sugestoes._meta.cliente_codigo).toBe('123456');
      expect(sugestoes._meta.cliente_nome).toBe('JOAO DA SILVA');
    });

    test('extrai vendedor e emissão', () => {
      const { sugestoes } = extrairSugestoesPdf(TEXTO_PDF_UMA_PAGINA);
      expect(sugestoes._meta.vendedor_codigo).toBe('086');
      expect(sugestoes._meta.vendedor_nome).toContain('GUILHERME');
      expect(sugestoes._meta.emissao).toBe('2026-08-26');
    });

    test('sugere fluxo comercial quando reconhece um orcamento', () => {
      const { sugestoes } = extrairSugestoesPdf(TEXTO_PDF_UMA_PAGINA);
      expect(sugestoes.fluxo_sugerido).toBe(NOME_FLUXO_ORCAMENTO);
    });

    test('nao sugere fluxo quando o texto nao tem nada de orcamento', () => {
      const { sugestoes } = extrairSugestoesPdf('documento qualquer sem dados');
      expect(sugestoes.fluxo_sugerido).toBeUndefined();
    });

    test('nome e truncado quando pdfjs concatena campos na mesma linha', () => {
      const texto = (
        'Cliente....: 000002 - João Cliente Dois Cliente....: CNPJ/CPF: '
        + 'Endereço: Insc.Est....: Código Descrição ...'
      );
      const { sugestoes } = extrairSugestoesPdf(texto);
      expect(sugestoes._meta.cliente_codigo).toBe('000002');
      expect(sugestoes._meta.cliente_nome).toBe('João Cliente Dois');
    });

    test('nome com palavra Cliente no meio nao e truncado', () => {
      const texto = 'Cliente....: 123456 - Loja do Cliente Ltda';
      const { sugestoes } = extrairSugestoesPdf(texto);
      expect(sugestoes._meta.cliente_nome).toBe('Loja do Cliente Ltda');
    });

    test('retorna estrutura vazia para entrada invalida', () => {
      const r = extrairSugestoesPdf('');
      expect(r.sugestoes).toEqual({});
    });
  });

  describe('helpers', () => {
    test('normalizarData produz ISO', () => {
      expect(normalizarData('31', '12', '2026')).toBe('2026-12-31');
      expect(normalizarData('1', '1', '26')).toBe('2026-01-01');
      expect(normalizarData('32', '12', '2026')).toBeNull();
    });

    test('parseValorBR aceita formatos BR e decimal', () => {
      expect(parseValorBR('1.234,56')).toBe(1234.56);
      expect(parseValorBR('1234.56')).toBe(1234.56);
      expect(parseValorBR('')).toBeNull();
    });

    test('formatarValorExibicao usa pt-BR', () => {
      expect(formatarValorExibicao(1234.5)).toBe('1.234,50');
    });
  });
});
