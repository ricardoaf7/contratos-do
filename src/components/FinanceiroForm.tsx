import React, { useState, useEffect } from 'react';
import { X, Save, Calculator, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ExecucaoFinanceira } from '../types';

interface FinanceiroFormProps {
  onClose: () => void;
  onSuccess: () => void;
  contratoId: string;
  processoId?: string; // New prop
  lancamento?: ExecucaoFinanceira;
  readOnly?: boolean;
}
type TipoLancamento = 'Empenho' | 'Nota Fiscal' | 'Liquidação' | 'Estorno';

const CurrencyInput = ({ 
  value, 
  onChange, 
  disabled = false, 
  placeholder = "0,00",
  className = "" 
}: { 
  value: number, 
  onChange: (val: number) => void, 
  disabled?: boolean, 
  placeholder?: string,
  className?: string
}) => {
  const formatDisplay = (val: number) => {
    if (val === undefined || val === null) return '';
    return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
  };

  const [displayValue, setDisplayValue] = useState(formatDisplay(value));

  useEffect(() => {
    setDisplayValue(formatDisplay(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    const numValue = Number(rawValue) / 100;
    onChange(numValue);
  };

  return (
    <input
      type="text"
      className={`w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${className}`}
      value={displayValue}
      onChange={handleChange}
      disabled={disabled}
      placeholder={placeholder}
    />
  );
};

const FinanceiroForm = ({ onClose, onSuccess, contratoId, processoId, lancamento, readOnly = false }: FinanceiroFormProps) => {
  const [loading, setLoading] = useState(false);
  const [tipo, setTipo] = useState<TipoLancamento>(lancamento?.tipo_documento as TipoLancamento || 'Empenho');
  const [activeTab, setActiveTab] = useState('dados');
  
  const [formData, setFormData] = useState<Partial<ExecucaoFinanceira>>(
    lancamento ? { ...lancamento } : {
    contrato_id: contratoId,
    tipo_documento: 'Empenho', // Default for backend compatibility
    data_lancamento: new Date().toISOString().split('T')[0],
    
    // Empenho
    numero_empenho: '',
    data_empenho: '',
    valor_empenho: 0,
    
    // Pedido Empenho
    is_pedido_empenho: false,
    pedido_empenho_sei: '',
    data_pedido_empenho: '',

    // Liquidação / NF
    numero_nf: '',
    data_nf: '',
    valor_nf: 0,
    numero_liquidacao: '',
    data_liquidacao: '',
    valor_liquidacao: 0,

    // Impostos
    valor_iss: 0,
    valor_retencoes: 0,
    valor_glosa: 0,

    // Estorno
    estorno_valor: 0,
    estorno_motivo: '',
    estorno_data: ''
  });

  useEffect(() => {
    if (lancamento) {
        setFormData({ ...lancamento });
        if (lancamento.tipo_documento) {
            setTipo(lancamento.tipo_documento as TipoLancamento);
        }
    }
  }, [lancamento]);

  const [contractData, setContractData] = useState<any>(null);

  useEffect(() => {
    if (contratoId) {
      fetchContractData();
    }
  }, [contratoId]);

  const fetchContractData = async () => {
    const { data, error } = await supabase
      .from('contratos')
      .select('valor_mensal')
      .eq('id', contratoId)
      .single();
    
    if (data) {
      setContractData(data);
      // Auto-fill valor empenho se for novo e o valor estiver zerado
      if (!formData.valor_empenho || formData.valor_empenho === 0) {
        setFormData(prev => ({ ...prev, valor_empenho: data.valor_mensal }));
      }
    }
    if (error) console.error('Erro ao buscar contrato:', error);
  };
  
  // Componente de Data Inteligente (interno)
  const SmartDateInput = ({ 
    value, 
    onChange, 
    className = "" 
  }: { 
    value: string, 
    onChange: (val: string) => void,
    className?: string 
  }) => {
    // Value vem sempre YYYY-MM-DD ou vazio
    const [display, setDisplay] = useState('');

    useEffect(() => {
       // Se o value mudar externamente (ex: init), atualiza display
       if (value) {
         const [y, m, d] = value.split('-');
         setDisplay(`${d}/${m}/${y}`);
       }
    }, [value]);

    const handleBlur = () => {
       // Tenta interpretar o que foi digitado
       // Aceita: dd/mm, dd/mm/aaaa, ddmm, ddmmaaaa
       let input = display.replace(/\D/g, '');
       let day = '', month = '', year = '';

       if (input.length >= 3 && input.length <= 4) {
          // ddmm -> assume ano atual
          day = input.slice(0, 2);
          month = input.slice(2, 4);
          year = new Date().getFullYear().toString();
       } else if (input.length === 8) {
          // ddmmaaaa
          day = input.slice(0, 2);
          month = input.slice(2, 4);
          year = input.slice(4, 8);
       } else {
          // Formato inválido ou vazio, reverte para value original se existir
          if (value) {
             const [y, m, d] = value.split('-');
             setDisplay(`${d}/${m}/${y}`);
          } else {
             setDisplay('');
          }
          return;
       }

       // Validação básica
       const d = parseInt(day);
       const m = parseInt(month);
       const y = parseInt(year);

       if (d > 0 && d <= 31 && m > 0 && m <= 12 && y > 1900) {
          // Formata para YYYY-MM-DD
          const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          onChange(isoDate);
          // Atualiza display para dd/mm/aaaa
          setDisplay(`${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`);
       } else {
          alert('Data inválida');
          setDisplay('');
          onChange('');
       }
    };

    return (
      <input
        type="text"
        placeholder="dd/mm/aaaa"
        className={`w-full px-3 py-2 border border-gray-200 rounded-lg ${className}`}
        value={display}
        onChange={(e) => setDisplay(e.target.value)}
        onBlur={handleBlur}
      />
    );
  };

  // Handler para datas com auto-fill de ano
  const handleDateChange = (field: keyof ExecucaoFinanceira, value: string) => {
    // Se digitar apenas dia/mês (ex: 12/05), assume ano atual
    // Mas como o input é type="date", o browser já força o formato completo YYYY-MM-DD
    // Então vamos apenas setar o valor direto
    setFormData(prev => ({ ...prev, [field]: value, data_lancamento: value }));
  };

  const handleEmpenhoNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    // Sugerir /2025 se não tiver barra e tiver tamanho suficiente
    // Simplificado: apenas deixa digitar livremente, mas pode vir com placeholder
    setFormData(prev => ({ ...prev, numero_empenho: val }));
  };

  const handleEmpenhoNumberBlur = () => {
    // Ao sair do campo, se tiver apenas números, adiciona /AnoAtual
    if (formData.numero_empenho && /^\d+$/.test(formData.numero_empenho)) {
      const year = new Date().getFullYear();
      setFormData(prev => ({ ...prev, numero_empenho: `${prev.numero_empenho}/${year}` }));
    }
  };

  const valorLiquido = (formData.valor_liquidacao || 0) - 
                       (formData.valor_retencoes || 0) - 
                       (formData.valor_iss || 0) - 
                       (formData.valor_glosa || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Preparar payload baseado no tipo selecionado
      const payload: any = {
        contrato_id: contratoId,
        processo_execucao_id: processoId, // Link process
        data_lancamento: formData.data_lancamento,
        tipo_documento: tipo === 'Liquidação' ? 'Liquidação' : tipo, // Mapeia para o enum do banco
      };

      if (tipo === 'Empenho') {
        if (formData.is_pedido_empenho) {
           if (!formData.pedido_empenho_sei) throw new Error('Número do SEI é obrigatório para pedido');
           payload.is_pedido_empenho = true;
           payload.pedido_empenho_sei = formData.pedido_empenho_sei;
           payload.data_pedido_empenho = formData.data_pedido_empenho || formData.data_lancamento;
           
           // Constraint Fix: Preencher numero_documento com o SEI
           payload.numero_documento = formData.pedido_empenho_sei;
           
           // Constraint Fix: valor_bruto (pode ser 0 se for só pedido, mas DB pode reclamar)
           payload.valor_bruto = 0; 
           // Constraint Fix: valor_liquido
           payload.valor_liquido = 0;

        } else {
           if (!formData.numero_empenho || !formData.valor_empenho) throw new Error('Número e Valor do Empenho são obrigatórios');
           payload.numero_empenho = formData.numero_empenho;
           payload.data_empenho = formData.data_empenho || formData.data_lancamento;
           payload.valor_empenho = formData.valor_empenho;

           // Constraint Fix: Preencher numero_documento com o Empenho
           payload.numero_documento = formData.numero_empenho;
           // Constraint Fix: valor_bruto
           payload.valor_bruto = formData.valor_empenho;
           // Constraint Fix: valor_liquido (Empenho não tem desconto ainda)
           payload.valor_liquido = formData.valor_empenho;
        }
      } 
else if (tipo === 'Nota Fiscal') {
if (!formData.numero_nf || !formData.valor_nf) throw new Error('Número e Valor da NF são obrigatórios');
payload.numero_nf = formData.numero_nf;
        payload.data_nf = formData.data_nf || formData.data_lancamento;
        payload.valor_nf = formData.valor_nf;
        
        // Checklist fields
        payload.recebimento_servico_bool = formData.recebimento_servico_bool;
        payload.recebimento_servico_data = formData.recebimento_servico_data;
        payload.parecer_tecnico_campo_bool = formData.parecer_tecnico_campo_bool;
        payload.parecer_tecnico_campo_data = formData.parecer_tecnico_campo_data;
        payload.parecer_tecnico_doc_bool = formData.parecer_tecnico_doc_bool;
        payload.parecer_tecnico_doc_data = formData.parecer_tecnico_doc_data;

        payload.numero_documento = formData.numero_nf;
payload.valor_bruto = formData.valor_nf;
payload.valor_liquido = formData.valor_nf;
if (formData.data_nf) {
const d = new Date(formData.data_nf);
const mes = String(d.getMonth() + 1).padStart(2, '0');
payload.mes_referencia = `${d.getFullYear()}-${mes}-01`;
payload.ano_referencia = d.getFullYear();
}
}
else if (tipo === 'Liquidação') {
        if (!formData.numero_nf || !formData.valor_liquidacao) throw new Error('Número da NF e Valor da Liquidação são obrigatórios');
        payload.numero_nf = formData.numero_nf;
        payload.data_nf = formData.data_nf;
        payload.valor_nf = formData.valor_nf || formData.valor_liquidacao; // Assume valor da NF = Liq se não informado
        
        payload.numero_liquidacao = formData.numero_liquidacao;
        payload.data_liquidacao = formData.data_liquidacao || formData.data_lancamento;
        payload.valor_liquidacao = formData.valor_liquidacao;
        
        payload.valor_iss = formData.valor_iss;
        payload.valor_retencoes = formData.valor_retencoes;
        payload.valor_glosa = formData.valor_glosa;
        payload.valor_liquido = valorLiquido;

        // Constraint Fix: Preencher numero_documento com a NF
        payload.numero_documento = formData.numero_nf;
        // Constraint Fix: valor_bruto
        payload.valor_bruto = formData.valor_liquidacao;
      }
      else if (tipo === 'Estorno') {
        if (!formData.estorno_valor) throw new Error('Valor do estorno é obrigatório');
        payload.estorno_valor = formData.estorno_valor;
        payload.estorno_motivo = formData.estorno_motivo;
        payload.estorno_data = formData.estorno_data || formData.data_lancamento;

        // Constraint Fix: Preencher numero_documento com identificador de estorno
        payload.numero_documento = `EST-${new Date().getTime().toString().slice(-6)}`;
        // Constraint Fix: valor_bruto
        payload.valor_bruto = formData.estorno_valor;
        // Constraint Fix: valor_liquido
        payload.valor_liquido = formData.estorno_valor;
      }

      let error;
      if (lancamento?.id) {
         const { error: updateError } = await supabase
           .from('execucoes_financeiras')
           .update(payload)
           .eq('id', lancamento.id);
         error = updateError;
      } else {
         const { error: insertError } = await supabase.from('execucoes_financeiras').insert(payload);
         error = insertError;
      }

      if (error) {
        console.error('Erro Supabase:', error);
        throw error;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      alert('Erro ao salvar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">
            {readOnly ? 'Detalhes do Lançamento' : (lancamento ? 'Editar Lançamento' : 'Novo Lançamento Financeiro')}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* Seletor de Tipo */}
          <div className="grid grid-cols-4 gap-2 p-1 bg-gray-100 rounded-lg">
            {(['Empenho', 'Nota Fiscal', 'Liquidação', 'Estorno'] as TipoLancamento[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => !readOnly && setTipo(t)}
                disabled={readOnly}
                className={`py-2 text-xs md:text-sm font-medium rounded-md transition-all ${
                  tipo === t 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                } ${readOnly ? 'cursor-not-allowed opacity-75' : ''}`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* --- EMPENHO --- */}
            {tipo === 'Empenho' && (
              <>
                <div className="md:col-span-2 flex items-center gap-4 bg-gray-50 p-3 rounded-lg border border-gray-200 mb-2">
                   <div className="flex items-center h-5">
                      <input
                        id="is_pedido"
                        type="checkbox"
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        checked={formData.is_pedido_empenho}
                        onChange={(e) => setFormData({...formData, is_pedido_empenho: e.target.checked})}
                      />
                   </div>
                   <div className="text-sm">
                      <label htmlFor="is_pedido" className="font-medium text-gray-700">Apenas Pedido de Empenho?</label>
                      <p className="text-xs text-gray-500">Marque se o empenho ainda não foi emitido, apenas solicitado via SEI.</p>
                   </div>
                </div>

                {formData.is_pedido_empenho ? (
                  <>
                     <div className="md:col-span-2 bg-yellow-50 p-4 rounded-lg border border-yellow-100 text-yellow-800 text-sm flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Registro de solicitação. O valor e número do empenho serão preenchidos posteriormente.
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Número do Processo SEI (Solicitação)</label>
                        <input 
                          required
                          type="text" 
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                          placeholder="Ex: 00000.00000/2025-00"
                          value={formData.pedido_empenho_sei}
                          onChange={e => setFormData({...formData, pedido_empenho_sei: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Data da Solicitação</label>
                        <SmartDateInput
                          value={formData.data_pedido_empenho || formData.data_lancamento || ''}
                          onChange={val => setFormData({...formData, data_pedido_empenho: val, data_lancamento: val})}
                        />
                      </div>
                  </>
                ) : (
                  <>
                    <div className="md:col-span-2 bg-blue-50 p-4 rounded-lg border border-blue-100 text-blue-800 text-sm flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Use esta opção para registrar a reserva de orçamento (Nota de Empenho) já emitida.
                    </div>
                    
                    {/* Campos de Pedido Opcionais para vincular */}
                    <div className="md:col-span-2 grid grid-cols-2 gap-4 border-b pb-4 mb-2">
                       <div className="col-span-2">
                          <span className="text-xs font-bold text-gray-500 uppercase">Dados da Solicitação (Opcional)</span>
                       </div>
                       <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Nº SEI da Solicitação</label>
                          <input 
                            type="text" 
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                            placeholder="Se houver"
                            value={formData.pedido_empenho_sei}
                            onChange={e => setFormData({...formData, pedido_empenho_sei: e.target.value})}
                          />
                       </div>
                       <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Data Solicitação</label>
                          <SmartDateInput
                            value={formData.data_pedido_empenho || ''}
                            onChange={val => setFormData({...formData, data_pedido_empenho: val})}
                          />
                       </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Número do Empenho</label>
                      <input 
                        required
                        type="text" 
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                        placeholder="Ex: 2024NE000123"
                        value={formData.numero_empenho}
                        onChange={handleEmpenhoNumberChange}
                        onBlur={handleEmpenhoNumberBlur}
                      />
                      <p className="text-[10px] text-gray-500 mt-1">Dica: Digite o número e saia para auto-completar o ano.</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Data do Empenho</label>
                      <SmartDateInput
                        value={formData.data_empenho || ''}
                        onChange={val => setFormData({...formData, data_empenho: val, data_lancamento: val})}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Valor do Empenho</label>
                      <CurrencyInput 
                        value={formData.valor_empenho || 0}
                        onChange={val => setFormData({...formData, valor_empenho: val})}
                        className="text-lg font-bold text-gray-900"
                      />
                    </div>
                  </>
                )}
              </>
            )}

            {/* --- NOTA FISCAL (Novo Fluxo) --- */}
            {tipo === 'Nota Fiscal' && (
              <>
                {/* Abas de Navegação */}
                <div className="md:col-span-2 flex border-b border-gray-200 mb-4">
                  <button
                    type="button"
                    onClick={() => setActiveTab('dados')}
                    className={`px-4 py-2 text-sm font-medium ${activeTab === 'dados' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    1. Dados da NF
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('checklist')}
                    className={`px-4 py-2 text-sm font-medium ${activeTab === 'checklist' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    2. Checklist de Execução
                  </button>
                </div>

                {activeTab === 'dados' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:col-span-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Número da Nota Fiscal</label>
                      <input 
                        required
                        type="text" 
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                        value={formData.numero_nf}
                        onChange={e => setFormData({...formData, numero_nf: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Data de Emissão</label>
                      <SmartDateInput
                        value={formData.data_nf || ''}
                        onChange={val => setFormData({...formData, data_nf: val, data_lancamento: val})}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Valor da Nota</label>
                      <CurrencyInput 
                        value={formData.valor_nf || 0}
                        onChange={val => setFormData({...formData, valor_nf: val})}
                        className="text-lg font-bold text-gray-900"
                      />
                    </div>
                  </div>
                )}

                {activeTab === 'checklist' && (
                  <div className="md:col-span-2 space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900">1. Recebimento do Serviço?</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setFormData({...formData, recebimento_servico_bool: true, recebimento_servico_data: new Date().toISOString().split('T')[0]})}
                            className={`px-3 py-1 rounded text-xs font-bold ${formData.recebimento_servico_bool ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-white border border-gray-300 text-gray-500'}`}
                          >
                            Sim
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData({...formData, recebimento_servico_bool: false, recebimento_servico_data: ''})}
                            className={`px-3 py-1 rounded text-xs font-bold ${!formData.recebimento_servico_bool ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-white border border-gray-300 text-gray-500'}`}
                          >
                            Não
                          </button>
                        </div>
                      </div>
                      {formData.recebimento_servico_bool && (
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Data do Recebimento</label>
                          <SmartDateInput
                            value={formData.recebimento_servico_data || ''}
                            onChange={val => setFormData({...formData, recebimento_servico_data: val})}
                            className="bg-white"
                          />
                        </div>
                      )}
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900">2. Parecer Técnico (Campo)?</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setFormData({...formData, parecer_tecnico_campo_bool: true, parecer_tecnico_campo_data: new Date().toISOString().split('T')[0]})}
                            className={`px-3 py-1 rounded text-xs font-bold ${formData.parecer_tecnico_campo_bool ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-white border border-gray-300 text-gray-500'}`}
                          >
                            Sim
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData({...formData, parecer_tecnico_campo_bool: false, parecer_tecnico_campo_data: ''})}
                            className={`px-3 py-1 rounded text-xs font-bold ${!formData.parecer_tecnico_campo_bool ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-white border border-gray-300 text-gray-500'}`}
                          >
                            Não
                          </button>
                        </div>
                      </div>
                      {formData.parecer_tecnico_campo_bool && (
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Data do Parecer</label>
                          <SmartDateInput
                            value={formData.parecer_tecnico_campo_data || ''}
                            onChange={val => setFormData({...formData, parecer_tecnico_campo_data: val})}
                            className="bg-white"
                          />
                        </div>
                      )}
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900">3. Parecer Técnico (Documental)?</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setFormData({...formData, parecer_tecnico_doc_bool: true, parecer_tecnico_doc_data: new Date().toISOString().split('T')[0]})}
                            className={`px-3 py-1 rounded text-xs font-bold ${formData.parecer_tecnico_doc_bool ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-white border border-gray-300 text-gray-500'}`}
                          >
                            Sim
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData({...formData, parecer_tecnico_doc_bool: false, parecer_tecnico_doc_data: ''})}
                            className={`px-3 py-1 rounded text-xs font-bold ${!formData.parecer_tecnico_doc_bool ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-white border border-gray-300 text-gray-500'}`}
                          >
                            Não
                          </button>
                        </div>
                      </div>
                      {formData.parecer_tecnico_doc_bool && (
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Data do Parecer</label>
                          <SmartDateInput
                            value={formData.parecer_tecnico_doc_data || ''}
                            onChange={val => setFormData({...formData, parecer_tecnico_doc_data: val})}
                            className="bg-white"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* --- LIQUIDAÇÃO / NF --- */}
            {tipo === 'Liquidação' && (
              <>
                {/* Nota Fiscal */}
                <div className="md:col-span-2 mt-2">
                  <h3 className="text-sm font-bold text-gray-900 border-b pb-1 mb-3">Dados da Nota Fiscal</h3>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Número da NF</label>
                  <input 
                    required
                    type="text" 
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                    value={formData.numero_nf}
                    onChange={e => setFormData({...formData, numero_nf: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Data de Emissão</label>
                  <input 
                    required
                    type="date" 
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                    value={formData.data_nf}
                    onChange={e => setFormData({...formData, data_nf: e.target.value})}
                  />
                </div>

                {/* Liquidação */}
                <div className="md:col-span-2 mt-2">
                  <h3 className="text-sm font-bold text-gray-900 border-b pb-1 mb-3">Dados da Liquidação</h3>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Número da Liquidação (Opcional)</label>
                  <input 
                    type="text" 
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                    placeholder="Se houver"
                    value={formData.numero_liquidacao}
                    onChange={e => setFormData({...formData, numero_liquidacao: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Data da Liquidação</label>
                  <input 
                    required
                    type="date" 
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                    value={formData.data_liquidacao}
                    onChange={e => setFormData({...formData, data_liquidacao: e.target.value, data_lancamento: e.target.value})}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Valor Bruto (Liquidação)</label>
                  <CurrencyInput 
                    value={formData.valor_liquidacao || 0}
                    onChange={val => setFormData({...formData, valor_liquidacao: val})}
                    className="text-lg font-bold text-gray-900 bg-gray-50"
                  />
                </div>

                {/* Retenções */}
                <div className="md:col-span-2 mt-2">
                  <h3 className="text-sm font-bold text-gray-900 border-b pb-1 mb-3">Retenções e Impostos</h3>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Retenções Federais (IR/PIS/COFINS/CSLL)</label>
                  <CurrencyInput 
                    value={formData.valor_retencoes || 0}
                    onChange={val => setFormData({...formData, valor_retencoes: val})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">ISS (Municipal)</label>
                  <CurrencyInput 
                    value={formData.valor_iss || 0}
                    onChange={val => setFormData({...formData, valor_iss: val})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Glosas / Descontos</label>
                  <CurrencyInput 
                    value={formData.valor_glosa || 0}
                    onChange={val => setFormData({...formData, valor_glosa: val})}
                  />
                </div>
                
                {/* Total Líquido */}
                <div className="md:col-span-2 mt-2 bg-green-50 p-4 rounded-lg border border-green-100 flex justify-between items-center">
                  <span className="text-sm font-bold text-green-800">Valor Líquido a Pagar</span>
                  <span className="text-xl font-bold text-green-700">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorLiquido)}
                  </span>
                </div>
              </>
            )}

            {/* --- ESTORNO --- */}
            {tipo === 'Estorno' && (
              <>
                <div className="md:col-span-2 bg-red-50 p-4 rounded-lg border border-red-100 text-red-800 text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Estornos devolvem saldo ao contrato. Use com cuidado.
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Valor do Estorno</label>
                  <CurrencyInput 
                    value={formData.estorno_valor || 0}
                    onChange={val => setFormData({...formData, estorno_valor: val})}
                    className="text-lg font-bold text-red-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Data do Estorno</label>
                  <input 
                    required
                    type="date" 
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                    value={formData.estorno_data}
                    onChange={e => setFormData({...formData, estorno_data: e.target.value, data_lancamento: e.target.value})}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Motivo / Justificativa</label>
                  <textarea 
                    required
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                    placeholder="Ex: Cancelamento de empenho por inexecução..."
                    value={formData.estorno_motivo}
                    onChange={e => setFormData({...formData, estorno_motivo: e.target.value})}
                  />
                </div>
              </>
            )}

          </div>

          <div className="flex justify-end pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg mr-2"
            >
              {readOnly ? 'Fechar' : 'Cancelar'}
            </button>
            {!readOnly && (
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {loading ? 'Salvando...' : 'Confirmar Lançamento'}
            </button>
            )}
          </div>
          </form>
      </div>
    </div>
  );
};

export default FinanceiroForm;
