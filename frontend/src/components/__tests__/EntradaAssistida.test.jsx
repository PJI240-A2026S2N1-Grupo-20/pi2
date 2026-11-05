import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EntradaAssistida } from '../EntradaAssistida';
import { vi } from 'vitest';

vi.mock('../../utils/pdfTexto', () => ({
  lerTextoPdf: vi.fn(),
}));

import { lerTextoPdf } from '../../utils/pdfTexto';

const fluxos = [
  { id: 1, nome: 'Atendimento Comercial' },
  { id: 2, nome: 'Pós-venda' },
];

describe('EntradaAssistida - RF-24 (conversa)', () => {
  test('exige texto antes de analisar', () => {
    render(<EntradaAssistida onAplicarSugestoes={vi.fn()} fluxos={fluxos} />);
    fireEvent.click(screen.getByRole('button', { name: /Analisar conversa/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/Cole o texto/i);
  });

  test('sugere o fluxo quando há palavra-chave', () => {
    const onAplicar = vi.fn();
    render(<EntradaAssistida onAplicarSugestoes={onAplicar} fluxos={fluxos} />);
    fireEvent.change(screen.getByLabelText(/Conversa do WhatsApp/i), {
      target: { value: 'Boa tarde, segue o orçamento.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Analisar conversa/i }));

    expect(onAplicar).toHaveBeenCalledWith({
      origem: 'conversa',
      fluxo_sugerido: 'Atendimento Comercial',
    });
    expect(screen.getByText(/Fluxo "Atendimento Comercial" selecionado/i)).toBeInTheDocument();
  });

  test('avisa quando o fluxo comercial não está cadastrado', () => {
    const onAplicar = vi.fn();
    render(
      <EntradaAssistida onAplicarSugestoes={onAplicar} fluxos={[{ id: 9, nome: 'Outro' }]} />
    );
    fireEvent.change(screen.getByLabelText(/Conversa do WhatsApp/i), {
      target: { value: 'Segue o orçamento.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Analisar conversa/i }));

    expect(onAplicar).not.toHaveBeenCalled();
    expect(screen.getByText(/não está cadastrado/i)).toBeInTheDocument();
  });

  test('avisa quando não há palavra-chave', () => {
    render(<EntradaAssistida onAplicarSugestoes={vi.fn()} fluxos={fluxos} />);
    fireEvent.change(screen.getByLabelText(/Conversa do WhatsApp/i), {
      target: { value: 'Bom dia, tudo bem?' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Analisar conversa/i }));
    expect(screen.getByText(/Nenhuma palavra-chave/i)).toBeInTheDocument();
  });
});

describe('EntradaAssistida - RF-25 (PDF)', () => {
  const TEXTO_PDF = `
Nº: 473528 Emissão: 26/08/2026 12:26:54
Cliente....: 000001 -
VI.Produtos: 113,59 VI.Desconto: 0,00 VI.ICMS ST: 0,00 VI.Total: 113,59
OS PREÇOS SÃO VÁLIDOS ATÉ 27/08/2026
`;

  beforeEach(() => {
    lerTextoPdf.mockReset();
  });

  test('mostra prévia dos campos extraídos', async () => {
    lerTextoPdf.mockResolvedValue(TEXTO_PDF);
    render(<EntradaAssistida onAplicarSugestoes={vi.fn()} fluxos={fluxos} />);

    const pdf = new File(['%PDF-1.4'], 'orc.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByLabelText(/Selecionar PDF do orçamento/i), {
      target: { files: [pdf] },
    });

    await waitFor(() => {
      expect(screen.getByTestId('previa-numero_orcamento')).toBeInTheDocument();
      expect(screen.getByTestId('previa-vl_total')).toBeInTheDocument();
    });
  });

  test('Aplicar todos entrega arquivo e campos', async () => {
    lerTextoPdf.mockResolvedValue(TEXTO_PDF);
    const onAplicar = vi.fn();
    render(<EntradaAssistida onAplicarSugestoes={onAplicar} fluxos={fluxos} />);

    const pdf = new File(['%PDF-1.4'], 'orc.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByLabelText(/Selecionar PDF do orçamento/i), {
      target: { files: [pdf] },
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Aplicar todos/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /Aplicar todos/i }));

    await waitFor(() => expect(onAplicar).toHaveBeenCalledTimes(1));
    const patch = onAplicar.mock.calls[0][0];
    expect(patch.origem).toBe('pdf');
    expect(patch.arquivo).toBe(pdf);
    expect(patch.numero_orcamento).toBe('473528');
    expect(patch.vl_total).toBe(113.59);
    expect(patch.fluxo_sugerido).toBe('Atendimento Comercial');
    expect(patch._meta.cliente_codigo).toBe('000001');
  });

  test('erro quando o PDF não tem texto', async () => {
    lerTextoPdf.mockResolvedValue('');
    render(<EntradaAssistida onAplicarSugestoes={vi.fn()} fluxos={fluxos} />);

    const pdf = new File(['%PDF-1.4'], 'scan.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByLabelText(/Selecionar PDF do orçamento/i), {
      target: { files: [pdf] },
    });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Não foi possível extrair texto/i);
    });
  });
});
