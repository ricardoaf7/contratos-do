import React, { useState, useEffect } from 'react';
import { X, Save, Calculator } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Contrato, Profile } from '../types';

interface ContractFormProps {
  onClose: () => void;
  onSuccess: () => void;
  contrato?: Contrato;
}

const ContractForm = ({ onClose, onSuccess, contrato }: ContractFormProps) => {
  const [loading, setLoading] = useState(false);
  const [fiscais, setFiscais] = useState<Profile[]>([]);
  
  const [formData, setFormData] = useState<Partial<Contrato>>({
    numero_processo: '',
    modalidade: '',
    tipo: 'Serviços',
    empresa_contratada: '',
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
  }, []);

  const fetchFiscais = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .in('role', ['fiscal', 'gerente', 'diretor']) // All can be responsible, but mostly fiscais
      .order('nome');
    
    if (data) setFiscais(data);
  };

  const calculateDates = () => {
    if (formData.data_assinatura) {
      const assinatura = new Date(formData.data_assinatura);
      
      // Default: 12 months validity
      const vencimento = new Date(assinatura);
      vencimento.setMonth(vencimento.getMonth() + 12);
      vencimento.setDate(vencimento.getDate() - 1);
      
      // Default: 60 months legal limit (Lei 8.666/14.133)
      const limite = new Date(assinatura);
      limite.setMonth(limite.getMonth() + 60);

      setFormData(prev => ({
        ...prev,
        data_vencimento: vencimento.toISOString().split('T')[0],
        data_limite_legal: limite.toISOString().split('T')[0]
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
        const { error } = await supabase
          .from('contratos')
          .insert(formData);
        if (error) throw error;
      }
      onSuccess();
    } catch (error: any) {
      alert('Erro ao salvar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">
            {contrato ? 'Editar Contrato' : 'Novo Contrato'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Número do Processo
              </label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.numero_processo}
                onChange={e => setFormData({...formData, numero_processo: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Modalidade
              </label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Ex: Pregão 01/2024"
                value={formData.modalidade}
                onChange={e => setFormData({...formData, modalidade: e.target.value})}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Empresa Contratada
              </label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.empresa_contratada}
                onChange={e => setFormData({...formData, empresa_contratada: e.target.value})}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Objeto do Contrato
              </label>
              <textarea
                required
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.objeto}
                onChange={e => setFormData({...formData, objeto: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Valor Mensal
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                <input
                  type="number"
                  step="0.01"
                  className="w-full pl-10 pr-10 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.valor_mensal}
                  onChange={e => setFormData({...formData, valor_mensal: parseFloat(e.target.value)})}
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Valor Total/Anual
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                <input
                  type="number"
                  step="0.01"
                  required
                  className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.valor_anual}
                  onChange={e => setFormData({...formData, valor_anual: parseFloat(e.target.value)})}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data Assinatura
              </label>
              <input
                type="date"
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.data_assinatura}
                onChange={e => {
                  setFormData({...formData, data_assinatura: e.target.value});
                  // Trigger calc on next render or effect, but here we can call directly if needed
                }}
                onBlur={calculateDates}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data Vencimento (Vigência)
              </label>
              <input
                type="date"
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.data_vencimento}
                onChange={e => setFormData({...formData, data_vencimento: e.target.value})}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
              <p className="text-xs text-gray-500 mt-1">
                O fiscal selecionado terá acesso para visualizar e editar este contrato.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg flex items-center gap-2 transition-colors"
            >
              <Save className="h-4 w-4" />
              {loading ? 'Salvando...' : 'Salvar Contrato'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContractForm;
