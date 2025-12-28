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
  historico_aditivos?: string; // Deprecated, keeping for safety
  created_at?: string;
  updated_at?: string;
  fiscal_responsavel?: string;
}

export interface Aditivo {
  id: string;
  contrato_id: string;
  numero_sequencial: number;
  data_assinatura: string;
  valor_aditivo: number;
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


export interface ExecucaoFinanceira {
  id: string;
  contrato_id: string;
  data_lancamento: string;
  tipo_documento: 'Empenho' | 'Nota Fiscal' | 'Liquidação' | 'Estorno';
  numero_documento: string;
  valor_bruto: number;
  valor_impostos: number;
  valor_liquido: number;
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
