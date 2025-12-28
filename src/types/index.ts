export interface Contrato {
  id: string;
  numero_processo: string;
  numero_contrato?: string; // New field
  modalidade: string;
  numero_modalidade?: string; // New field
  tipo: string;
  empresa_contratada: string; // Razão Social / Nome Completo
  nome_exibicao?: string; // Nome Fantasia / Exibição
  objeto: string;
  
  // Valores Atuais (Efetivos)
  valor_mensal: number;
  valor_anual: number;
  
  // Vigência Atual (Efetiva)
  data_assinatura: string;
  data_vencimento: string;
  data_limite_legal: string;
  
  // Valores Originais (Snapshot inicial)
  valor_inicial?: number; // Annual Initial
  valor_mensal_inicial?: number; // Monthly Initial
  data_vencimento_inicial?: string;

  alerta_ativo: boolean;
  
  // Renovação / Prorrogação
  renovacao_solicitada?: boolean;
  data_solicitacao_renovacao?: string;
  processo_sei_renovacao?: string;
  justificativa_nao_renovacao?: string;

  historico_aditivos?: string; // Deprecated, keeping for safety
  created_at?: string;
  updated_at?: string;
  fiscal_responsavel?: string;
}

export interface Aditivo {
  id: string;
  contrato_id: string;
  tipo: 'Aditivo' | 'Apostilamento'; // New field
  numero_aditivo?: string; // New field (manual input)
  numero_sequencial?: number; // Deprecated but kept for ordering
  data_assinatura: string;
  valor_aditivo: number; // Keep for diff storage if needed
  novo_valor_mensal?: number; // New target value
  novo_vencimento?: string;
  descricao: string;
  created_at?: string;
  created_by?: string;
}

export interface ContratoVersao {
  id: string;
  contrato_id: string;
  changed_at: string;
  changed_by: string;
  snapshot_data: Contrato;
}


export interface ProcessoExecucaoMensal {
  id: string;
  contrato_id: string;
  mes_referencia: number;
  ano_referencia: number;
  numero_processo_sei?: string;
  status: 'Em Aberto' | 'Em Andamento' | 'Finalizado' | 'Cancelado';
  descricao_servicos?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ExecucaoFinanceira {
  id: string;
  contrato_id: string;
  processo_execucao_id?: string; // Link com o processo mensal
  data_lancamento: string; // Data geral do registro
  tipo_documento: 'Empenho' | 'Nota Fiscal' | 'Liquidação' | 'Estorno' | 'Pagamento';
  
  // Campos Detalhados
  numero_empenho?: string;
  data_empenho?: string;
  valor_empenho?: number;

  numero_nf?: string;
  data_nf?: string;
  valor_nf?: number;

  numero_liquidacao?: string;
  data_liquidacao?: string;
  valor_liquidacao?: number;

  // Impostos e Retenções
  valor_iss?: number;
  valor_retencoes?: number; // IR, INSS, etc.
  valor_glosa?: number;

  // Estornos
  estorno_valor?: number;
  estorno_data?: string;
  estorno_motivo?: string;

  // Pedido de Empenho
  is_pedido_empenho?: boolean;
  pedido_empenho_sei?: string;
  data_pedido_empenho?: string;

  // Checklist Nota Fiscal (Novo Fluxo)
  recebimento_servico_bool?: boolean;
  recebimento_servico_data?: string;
  parecer_tecnico_campo_bool?: boolean;
  parecer_tecnico_campo_data?: string;
  parecer_tecnico_doc_bool?: boolean;
  parecer_tecnico_doc_data?: string;

  // Organização
  mes_referencia?: string; // Data base para agrupamento (ex: 2025-01-01)
  ano_referencia?: number;

  // Campos Legados (Mantidos para compatibilidade se necessário, ou mapeados)
  numero_documento?: string; 
  valor_bruto?: number;
  valor_impostos?: number;
  valor_liquido?: number; // Calculado: Valor NF/Liq - Retenções - Glosas
  observacoes?: string;
}

export interface Profile {
  id: string;
  user_id: string;
  nome: string;
  email?: string;
  username?: string;
  role: 'diretor' | 'gerente' | 'fiscal';
  manager_id?: string; // Mantido para compatibilidade, mas a hierarquia principal será via gerencia_id/setor_id
  gerencia_id?: string;
  setor_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Gerencia {
  id: string;
  nome: string;
  created_at?: string;
}

export interface Setor {
  id: string;
  nome: string;
  gerencia_id: string;
  created_at?: string;
}
