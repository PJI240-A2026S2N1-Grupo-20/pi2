import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { getDelayInfo, DELAY_STATUS, getTaskTitle } from '../kanbanUtils';

describe('RF-30 - Indicadores de Atraso (L1/L2)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // 1 de outubro de 2026, 12:00 local
    vi.setSystemTime(new Date(2026, 9, 1, 12, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const baseTask = (dataPrevista, estado = 'a_fazer') => ({
    id: 1,
    data_prevista: dataPrevista,
    estado,
  });

  const limiares = { l1: 2, l2: 5 };

  test('sem data_prevista retorna none', () => {
    expect(getDelayInfo(baseTask(null), limiares).status).toBe(DELAY_STATUS.none);
  });

  test('tarefa concluída nunca é sinalizada', () => {
    const info = getDelayInfo(baseTask('2026-09-01', 'concluido'), limiares);
    expect(info.status).toBe(DELAY_STATUS.none);
  });

  test('data distante (> L2) retorna normal', () => {
    const info = getDelayInfo(baseTask('2026-10-20'), limiares);
    expect(info.status).toBe(DELAY_STATUS.normal);
    expect(info.daysUntil).toBe(19);
  });

  test('dentro de L2 (ex.: 4 dias) retorna warning (amarelo)', () => {
    const info = getDelayInfo(baseTask('2026-10-05'), limiares);
    expect(info.status).toBe(DELAY_STATUS.warning);
    expect(info.label).toBe('Vence em 4 dias');
  });

  test('exatamente L2 (5 dias) é o limite superior do warning', () => {
    const info = getDelayInfo(baseTask('2026-10-06'), limiares);
    expect(info.status).toBe(DELAY_STATUS.warning);
  });

  test('dentro de L1 (ex.: 1 dia) retorna critical (laranja)', () => {
    const info = getDelayInfo(baseTask('2026-10-02'), limiares);
    expect(info.status).toBe(DELAY_STATUS.critical);
    expect(info.label).toBe('Vence em 1 dia');
  });

  test('vence hoje retorna critical com rótulo "Vence hoje"', () => {
    const info = getDelayInfo(baseTask('2026-10-01'), limiares);
    expect(info.status).toBe(DELAY_STATUS.critical);
    expect(info.label).toBe('Vence hoje');
  });

  test('atrasada retorna critical com rótulo "Atrasado há N dias"', () => {
    const info = getDelayInfo(baseTask('2026-09-27'), limiares);
    expect(info.status).toBe(DELAY_STATUS.critical);
    expect(info.daysUntil).toBe(-4);
    expect(info.label).toBe('Atrasado há 4 dias');
  });

  test('atraso de 1 dia usa singular', () => {
    const info = getDelayInfo(baseTask('2026-09-30'), limiares);
    expect(info.label).toBe('Atrasado há 1 dia');
  });

  test('respeita limiares customizados (l1=1, l2=3)', () => {
    const custom = { l1: 1, l2: 3 };
    expect(getDelayInfo(baseTask('2026-10-03'), custom).status).toBe(DELAY_STATUS.warning);
    expect(getDelayInfo(baseTask('2026-10-02'), custom).status).toBe(DELAY_STATUS.critical);
  });

  test('limiares ausentes caem no default (2/5)', () => {
    expect(getDelayInfo(baseTask('2026-10-03'), undefined).status).toBe(DELAY_STATUS.critical);
    expect(getDelayInfo(baseTask('2026-10-05'), undefined).status).toBe(DELAY_STATUS.warning);
  });

  test('getTaskTitle permanece inalterado', () => {
    expect(getTaskTitle({ fluxo_nome: 'Orçamento', contato_nome: 'João' })).toBe('Orçamento - João');
  });
});
