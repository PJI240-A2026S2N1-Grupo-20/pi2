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
