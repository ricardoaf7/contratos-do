export interface Contrato {
  id: string;
  numero_processo: string;
  modalidade: string;
  tipo: string;
  empresa_contratada: string;
  objeto: string;
  valor_mensal: number;
  valor_anual: number;
  data_assinatura: string;
  data_vencimento: string;
  data_limite_legal: string;
  alerta_ativo: boolean;
  historico_aditivos?: string;
  created_at?: string;
  fiscal_responsavel?: string;
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
  role: 'diretor' | 'gerente' | 'fiscal';
  manager_id?: string;
}
