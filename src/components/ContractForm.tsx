import React, { useState, useEffect } from 'react';
import { X, Save, Calculator, Plus, Trash2, History, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Contrato, Profile, Aditivo } from '../types';

interface ContractFormProps {
  onClose: () => void;
  onSuccess: () => void;
  contrato?: Contrato;
}

type TabType = 'dados' | 'valores' | 'aditivos';

const CurrencyInput = ({ 
  value, 
  onChange, 
  disabled = false, 
  readOnly = false,
  className = "" 
}: { 
  value: number, 
  onChange: (val: number) => void, 
  disabled?: boolean, 
  readOnly?: boolean,
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
      className={className}
      value={displayValue}
      onChange={handleChange}
      disabled={disabled}
      readOnly={readOnly}
      placeholder="0,00"
    />
  );
};

const ContractForm = ({ onClose, onSuccess, contrato }: ContractFormProps) => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('dados');
  const [fiscais, setFiscais] = useState<Profile[]>([]);
  
  // Aditivos State
  const [aditivos, setAditivos] = useState<Aditivo[]>([]);
  const [showAditivoForm, setShowAditivoForm] = useState(false);
  const [newAditivo, setNewAditivo] = useState<Partial<Aditivo>>({
    valor_aditivo: 0,
    descricao: ''
  });

  const [formData, setFormData] = useState<Partial<Contrato>>({
    numero_processo: '',
    numero_contrato: '', // New field
    modalidade: '',
    numero_modalidade: '', // New field
    tipo: 'Serviços',
    empresa_contratada: '',
    nome_exibicao: '',
    objeto: '',
    valor_mensal: 0,
    valor_anual: 0,
    data_assinatura: '',
    data_vencimento: '',
    data_limite_legal: '',
    alerta_ativo: true,
    fiscal_responsavel: '',
    ...contrato
  });

  useEffect(() => {
    fetchFiscais();
    if (contrato?.id) {
      fetchAditivos();
    }
  }, [contrato]);

  const fetchFiscais = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .in('role', ['fiscal', 'gerente', 'diretor'])
      .order('nome');
    if (data) setFiscais(data);
  };

  const fetchAditivos = async () => {
    if (!contrato?.id) return;
    const { data } = await supabase
      .from('aditivos')
      .select('*')
      .eq('contrato_id', contrato.id)
      .order('numero_sequencial', { ascending: true });
    if (data) setAditivos(data);
  };

  const calculateDates = () => {
    if (formData.data_assinatura) {
      const assinatura = new Date(formData.data_assinatura);
      const vencimento = new Date(assinatura);
      vencimento.setMonth(vencimento.getMonth() + 12);
      vencimento.setDate(vencimento.getDate() - 1);
      
      const limite = new Date(assinatura);
      limite.setMonth(limite.getMonth() + 60);

      // Only update if empty, otherwise respect user input/correction
      setFormData(prev => ({
        ...prev,
        data_vencimento: prev.data_vencimento || vencimento.toISOString().split('T')[0],
        data_limite_legal: prev.data_limite_legal || limite.toISOString().split('T')[0]
      }));
    }
  };

  const calculateAnnual = () => {
    if (formData.valor_mensal) {
      setFormData(prev => ({
        ...prev,
        valor_anual: (prev.valor_mensal || 0) * 12
      }));
    }
  };

  const handleAddAditivo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contrato?.id || !newAditivo.data_assinatura || newAditivo.valor_aditivo === undefined) return;
    setLoading(true);

    try {
      // 1. Insert Aditivo
      const nextSeq = aditivos.length + 1;
      const { error: aditivoError } = await supabase.from('aditivos').insert({
        contrato_id: contrato.id,
        numero_sequencial: nextSeq,
        data_assinatura: newAditivo.data_assinatura,
        valor_aditivo: newAditivo.valor_aditivo,
        novo_vencimento: newAditivo.novo_vencimento || null,
        descricao: newAditivo.descricao
      });
      if (aditivoError) throw aditivoError;

      // 2. Update Contract (Accumulate Values)
      const newTotal = (formData.valor_anual || 0) + Number(newAditivo.valor_aditivo);
      const newVencimento = newAditivo.novo_vencimento || formData.data_vencimento;

      const { error: contractError } = await supabase
        .from('contratos')
        .update({
          valor_anual: newTotal,
          data_vencimento: newVencimento
        })
        .eq('id', contrato.id);
      
      if (contractError) throw contractError;

      alert('Aditivo registrado com sucesso!');
      setShowAditivoForm(false);
      setNewAditivo({ valor_aditivo: 0, descricao: '' });
      fetchAditivos();
      setFormData(prev => ({ ...prev, valor_anual: newTotal, data_vencimento: newVencimento }));
      onSuccess(); 
    } catch (err: any) {
      alert('Erro ao adicionar aditivo: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (contrato?.id) {
        const { error } = await supabase
          .from('contratos')
          .update(formData)
          .eq('id', contrato.id);
        if (error) throw error;
      } else {
        const payload = {
          ...formData,
          valor_inicial: formData.valor_anual,
          data_vencimento_inicial: formData.data_vencimento
        };
        const { error } = await supabase
          .from('contratos')
          .insert(payload);
        if (error) throw error;
      }
      onSuccess();
    } catch (error: any) {
      alert('Erro ao salvar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val?: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50 rounded-t-xl">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {contrato ? 'Gerenciar Contrato' : 'Novo Contrato'}
            </h2>
            {contrato && (
              <p className="text-sm text-gray-500 mt-1">Processo: {contrato.numero_processo}</p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6 bg-white sticky top-0 z-10">
          <button
            onClick={() => setActiveTab('dados')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'dados' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Dados Principais
          </button>
          <button
            onClick={() => setActiveTab('valores')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'valores' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Vigência e Valores
          </button>
          {contrato && (
            <button
              onClick={() => setActiveTab('aditivos')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'aditivos' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              Aditivos e Histórico
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto">
          {activeTab === 'aditivos' ? (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Aditivos Contratuais</h3>
                <button
                  onClick={() => setShowAditivoForm(!showAditivoForm)}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 font-medium text-sm transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  {showAditivoForm ? 'Cancelar' : 'Novo Aditivo'}
                </button>
              </div>

              {/* Add Aditivo Form */}
              {showAditivoForm && (
                <form onSubmit={handleAddAditivo} className="bg-gray-50 p-4 rounded-xl border border-blue-100 space-y-4 animate-in fade-in slide-in-from-top-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Data Assinatura</label>
                      <DateInput
                        required
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                        value={newAditivo.data_assinatura || ''}
                        onChange={val => setNewAditivo({...newAditivo, data_assinatura: val})}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Valor Adicionado (R$)</label>
                      <CurrencyInput
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                        value={newAditivo.valor_aditivo || 0}
                        onChange={val => setNewAditivo({...newAditivo, valor_aditivo: val})}
                      />
                      <p className="text-xs text-gray-400 mt-1">Use negativo para supressão.</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Novo Vencimento (Opcional)</label>
                      <DateInput
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                        value={newAditivo.novo_vencimento || ''}
                        onChange={val => setNewAditivo({...newAditivo, novo_vencimento: val})}
                      />
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Descrição / Objeto do Aditivo</label>
                      <input
                        type="text"
                        required
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                        placeholder="Ex: Prorrogação de prazo por 12 meses e reajuste de valor."
                        value={newAditivo.descricao}
                        onChange={e => setNewAditivo({...newAditivo, descricao: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                    >
                      {loading ? 'Registrando...' : 'Registrar Aditivo'}
                    </button>
                  </div>
                </form>
              )}

              {/* List */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 font-medium text-gray-700">#</th>
                      <th className="px-4 py-3 font-medium text-gray-700">Data</th>
                      <th className="px-4 py-3 font-medium text-gray-700">Descrição</th>
                      <th className="px-4 py-3 font-medium text-gray-700 text-right">Valor (+/-)</th>
                      <th className="px-4 py-3 font-medium text-gray-700 text-right">Novo Vencimento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {aditivos.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                          Nenhum aditivo registrado.
                        </td>
                      </tr>
                    ) : (
                      aditivos.map((ad) => (
                        <tr key={ad.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-500">{ad.numero_sequencial}º</td>
                          <td className="px-4 py-3">{formatDate(ad.data_assinatura)}</td>
                          <td className="px-4 py-3">{ad.descricao}</td>
                          <td className={`px-4 py-3 text-right font-medium ${ad.valor_aditivo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {ad.valor_aditivo > 0 ? '+' : ''}{formatCurrency(ad.valor_aditivo)}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-600">
                            {formatDate(ad.novo_vencimento)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <form id="main-form" onSubmit={handleSubmit} className="space-y-6">
              {activeTab === 'dados' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-left-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Número do Contrato <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="Ex: 123/2024"
                      value={formData.numero_contrato || ''}
                      onChange={e => setFormData({...formData, numero_contrato: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Número do Processo <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="Ex: 4567/2024"
                      value={formData.numero_processo}
                      onChange={e => setFormData({...formData, numero_processo: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Modalidade <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                      value={formData.modalidade}
                      onChange={e => setFormData({...formData, modalidade: e.target.value})}
                    >
                      <option value="">Selecione...</option>
                      <option value="Pregão Eletrônico">Pregão Eletrônico</option>
                      <option value="Concorrência">Concorrência</option>
                      <option value="Dispensa">Dispensa</option>
                      <option value="Inexigibilidade">Inexigibilidade</option>
                      <option value="Adesão à Ata">Adesão à Ata</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nº da Modalidade
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="Ex: 011/2024-FUL"
                      value={formData.numero_modalidade || ''}
                      onChange={e => setFormData({...formData, numero_modalidade: e.target.value})}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Empresa Contratada (Razão Social) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="Nome completo da empresa"
                      value={formData.empresa_contratada}
                      onChange={e => setFormData({...formData, empresa_contratada: e.target.value})}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome de Exibição (Nome Fantasia) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="Como aparecerá na lista (Ex: Empresa X)"
                      value={formData.nome_exibicao || ''}
                      onChange={e => setFormData({...formData, nome_exibicao: e.target.value})}
                    />
                    <p className="text-xs text-gray-500 mt-1">Este é o nome que será exibido na listagem principal.</p>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Objeto do Contrato <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      required
                      rows={4}
                      maxLength={500}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                      placeholder="Descrição resumida do objeto contratual..."
                      value={formData.objeto}
                      onChange={e => setFormData({...formData, objeto: e.target.value})}
                    />
                    <p className="text-xs text-gray-400 text-right mt-1">
                      {(formData.objeto?.length || 0)}/500 caracteres
                    </p>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fiscal Responsável
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                      value={formData.fiscal_responsavel || ''}
                      onChange={e => setFormData({...formData, fiscal_responsavel: e.target.value || undefined})}
                    >
                      <option value="">-- Selecione um Fiscal --</option>
                      {fiscais.map(f => (
                        <option key={f.user_id} value={f.user_id}>
                          {f.nome} ({f.role.toUpperCase()})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {activeTab === 'valores' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                  {/* Valores Originais (Read Only if Edit) */}
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                      <History className="h-4 w-4" /> Valores e Datas Originais
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                         <label className="block text-xs font-medium text-gray-500 mb-1">Valor Inicial do Contrato</label>
                         <div className="font-medium text-gray-900">
                           {contrato?.valor_inicial ? formatCurrency(contrato.valor_inicial) : (
                             <span className="text-gray-400 italic">Será definido ao salvar</span>
                           )}
                         </div>
                      </div>
                      <div>
                         <label className="block text-xs font-medium text-gray-500 mb-1">Vencimento Inicial</label>
                         <div className="font-medium text-gray-900">
                           {contrato?.data_vencimento_inicial ? formatDate(contrato.data_vencimento_inicial) : (
                             <span className="text-gray-400 italic">Será definido ao salvar</span>
                           )}
                         </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Valor Mensal
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                        <CurrencyInput
                          className="w-full pl-10 pr-10 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                          value={formData.valor_mensal || 0}
                          onChange={val => setFormData({...formData, valor_mensal: val})}
                        />
                        <button
                          type="button"
                          onClick={calculateAnnual}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600"
                          title="Calcular Anual (x12)"
                        >
                          <Calculator className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Valor Total Atual <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                        <CurrencyInput
                          className={`w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${contrato ? 'bg-blue-50 font-bold text-blue-700' : ''}`}
                          value={formData.valor_anual || 0}
                          onChange={val => setFormData({...formData, valor_anual: val})}
                        />
                      </div>
                      {contrato && (
                        <div className="flex items-start gap-2 mt-2 p-2 bg-yellow-50 rounded-lg text-xs text-yellow-700 border border-yellow-100">
                          <AlertTriangle className="h-4 w-4 shrink-0" />
                          <p>
                            Atenção: A edição direta deste campo altera o valor vigente. Para histórico legal, use a aba "Aditivos".
                          </p>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Data Assinatura <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        value={formData.data_assinatura}
                        onChange={e => setFormData({...formData, data_assinatura: e.target.value})}
                        onBlur={calculateDates}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Vencimento Atual <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        className={`w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${contrato ? 'bg-blue-50 font-bold text-blue-700' : ''}`}
                        value={formData.data_vencimento}
                        onChange={e => setFormData({...formData, data_vencimento: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
              )}
            </form>
          )}
        </div>

        {/* Footer Actions */}
        {activeTab !== 'aditivos' && (
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50 rounded-b-xl">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={(e) => {
                const form = document.getElementById('main-form') as HTMLFormElement;
                if (form) form.requestSubmit();
              }}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg flex items-center gap-2 transition-colors"
            >
              <Save className="h-4 w-4" />
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        )}
         {activeTab === 'aditivos' && (
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50 rounded-b-xl">
             <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Fechar
            </button>
          </div>
         )}
      </div>
    </div>
  );
};

export default ContractForm;
