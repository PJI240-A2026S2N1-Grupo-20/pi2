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

/**
 * RF-10: Geração Automática do Título
 * Formato: {Nome do Fluxo} · {Nome do Contato} ou "Tarefa" caso sem fluxo.
 */
export const getTaskTitle = (task) => {
  const fluxo = task.fluxo_nome?.trim();
  const contato = task.contato_nome?.trim();

  if (fluxo && contato) {
    return `${fluxo} · ${contato}`;
  }
  if (contato) {
    return `Tarefa · ${contato}`;
  }
  if (fluxo) {
    return `${fluxo} · Sem contato`;
  }
  return 'Tarefa';
};

/**
 * RF-07: Ordenação Cronológica Padrão
 * Apresenta as tarefas mais antigas no topo (ordem crescente de criação).
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
