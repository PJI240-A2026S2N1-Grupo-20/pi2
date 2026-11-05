/**
 * Formata strings de data (YYYY-MM-DD ou ISO) para o padrão brasileiro DD/MM/YYYY
 */
export const formatDateBR = (dateString) => {
  if (!dateString) return '';
  const cleanDate = dateString.split('T')[0];
  const parts = cleanDate.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
  }
  return dateString;
};

export const formatDateTimeBR = (isoString) => {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return isoString;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${mins}`;
};

export const ESTADO_LABEL = {
  pendencias: 'Pendências',
  a_fazer: 'A fazer',
  em_andamento: 'Em andamento',
  concluido: 'Concluído',
};

/** RN-01: matriz de transições (espelha o backend). */
export const TRANSICOES_PERMITIDAS = {
  pendencias: ['a_fazer'],
  a_fazer: ['pendencias', 'em_andamento', 'concluido'],
  em_andamento: ['pendencias', 'a_fazer', 'concluido'],
  concluido: ['a_fazer', 'em_andamento'],
};

export const transicaoPermitida = (origem, destino) => {
  return TRANSICOES_PERMITIDAS[origem]?.includes(destino) ?? false;
};

/**
 * RF-10: Geração Automática do Título
 * Formato: {Nome do Fluxo} - {Nome do Contato}; sem fluxo: "Tarefa - {Contato}";
 * sem contato: "Tarefa" (independentemente de haver fluxo).
 */
export const getTaskTitle = (task) => {
  const fluxo = task.fluxo_nome?.trim();
  const contato = task.contato_nome?.trim();

  if (contato) {
    return fluxo ? `${fluxo} - ${contato}` : `Tarefa - ${contato}`;
  }
  return 'Tarefa';
};

/**
 * RF-07: Ordenação Cronológica Padrão
 */
export const sortTasksChronologically = (tasks) => {
  return [...tasks].sort((a, b) => new Date(a.criado_em) - new Date(b.criado_em));
};

/* ============================================================================
 * RF-30: Indicadores de Atraso (L1/L2)
 *
 * Limiares (RF-04):
 *   L1 = limiar_amarelo_dias  (default 2) - ponto de atenção (amarelo)
 *   L2 = limiar_laranja_dias (default 5) - ponto crítico (laranja)
 *
 * Semântica adotada (dias_restantes = data_prevista - hoje):
 *   dias_restantes >  L2            -> normal    (sem alerta)
 *   L1 < dias_restantes <= L2       -> warning   (amarelo / L1)
 *   0  <= dias_restantes <= L1      -> critical  (laranja / L2)
 *   dias_restantes <  0 (atrasada)  -> critical  (laranja / L2, com rótulo "Atrasado")
 *
 * Tarefas concluídas ou sem data_prevista nunca são sinalizadas.
 * ========================================================================== */

export const DELAY_STATUS = {
  none: 'none',         // sem data ou concluída
  normal: 'normal',     // sem alerta
  warning: 'warning',   // amarelo (L1)
  critical: 'critical', // laranja (L2) - inclui atrasadas
};

/** Cores de borda/ponto (saturadas, chamam atenção no quadro). */
export const DELAY_COLORS = {
  none: '#3b82f6',
  normal: '#3b82f6',
  warning: '#f59e0b', // amber (L1)
  critical: '#ea580c', // orange (L2)
};

/** Estilos do badge textual (bg claro + texto escuro = contraste AA). */
export const DELAY_BADGE_STYLES = {
  warning: { backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' },
  critical: { backgroundColor: '#ffedd5', color: '#9a3412', border: '1px solid #fdba74' },
};

const parseDateOnly = (dateString) => {
  if (!dateString) return null;
  const datePart = String(dateString).split('T')[0];
  const [y, m, d] = datePart.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

/**
 * RF-30: Retorna o status de atraso da tarefa em função dos limiares.
 * @param {object} task
 * @param {{l1:number, l2:number}} limiares
 * @returns {{status:'none'|'normal'|'warning'|'critical', daysUntil:number|null, label:string}}
 */
export const getDelayInfo = (task, limiares) => {
  const l1 = limiares?.l1 ?? 2;
  const l2 = limiares?.l2 ?? 5;

  if (!task || !task.data_prevista || task.estado === 'concluido') {
    return { status: DELAY_STATUS.none, daysUntil: null, label: '' };
  }

  const due = parseDateOnly(task.data_prevista);
  if (!due) {
    return { status: DELAY_STATUS.none, daysUntil: null, label: '' };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  const diffMs = due.getTime() - today.getTime();
  const daysUntil = Math.round(diffMs / 86400000);

  if (daysUntil < 0) {
    const overdue = Math.abs(daysUntil);
    return {
      status: DELAY_STATUS.critical,
      daysUntil,
      label: `Atrasado há ${overdue} dia${overdue === 1 ? '' : 's'}`,
    };
  }
  if (daysUntil === 0) {
    return { status: DELAY_STATUS.critical, daysUntil, label: 'Vence hoje' };
  }
  if (daysUntil <= l1) {
    return {
      status: DELAY_STATUS.critical,
      daysUntil,
      label: `Vence em ${daysUntil} dia${daysUntil === 1 ? '' : 's'}`,
    };
  }
  if (daysUntil <= l2) {
    return {
      status: DELAY_STATUS.warning,
      daysUntil,
      label: `Vence em ${daysUntil} dias`,
    };
  }
  return { status: DELAY_STATUS.normal, daysUntil, label: '' };
};

export const INITIAL_TASKS = [
  {
    id: '1',
    fluxo_nome: 'Orçamento',
    contato_nome: 'João da Silva',
    estado: 'pendencias',
    data_prevista: null,
    criado_em: '2026-09-20T08:00:00Z',
    observacoes: 'Cliente solicitou cotação de cabos de 10mm e disjuntores trifásicos.',
    responsavel_nome: 'Carlos Vendedor',
    subtarefas: [
      { id: 's1', texto: 'Resultado [Concluída | Cancelada]', tipo: 'resultado', concluida: false }
    ]
  },
  {
    id: '2',
    fluxo_nome: 'Atendimento Comercial',
    contato_nome: 'EletroInstalações Prudente',
    estado: 'a_fazer',
    data_prevista: '2026-09-27',
    criado_em: '2026-09-21T09:30:00Z',
    observacoes: 'Enviar catálogo de luminárias LED industriais.',
    responsavel_nome: 'Carlos Vendedor',
    subtarefas: [
      { id: 's2', texto: 'Preparar orçamento', tipo: 'livre', concluida: true },
      { id: 's3', texto: 'Enviar orçamento', tipo: 'livre', concluida: false },
      { id: 's4', texto: 'Resultado [Concluída | Cancelada]', tipo: 'resultado', concluida: false }
    ]
  }
];
