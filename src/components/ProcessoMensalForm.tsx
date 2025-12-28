import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ProcessoExecucaoMensal } from '../types';

interface ProcessoMensalFormProps {
  onClose: () => void;
  onSuccess: () => void;
  contratoId: string;
  processo?: ProcessoExecucaoMensal;
}

const ProcessoMensalForm = ({ onClose, onSuccess, contratoId, processo }: ProcessoMensalFormProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<ProcessoExecucaoMensal>>({
    contrato_id: contratoId,
    mes_referencia: new Date().getMonth() + 1,
    ano_referencia: new Date().getFullYear(),
    numero_processo_sei: '',
    status: 'Em Aberto',
    descricao_servicos: ''
  });

  useEffect(() => {
    if (processo) {
      setFormData(processo);
    }
  }, [processo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (processo?.id) {
        const { error } = await supabase
          .from('processos_execucao_mensal')
          .update(formData)
          .eq('id', processo.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('processos_execucao_mensal')
          .insert(formData);
        if (error) throw error;
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Erro ao salvar processo:', error);
      alert('Erro ao salvar processo: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const anos = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 1 + i);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">
            {processo ? 'Editar Execução Mensal' : 'Nova Execução Mensal'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mês de Referência</label>
              <select
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                value={formData.mes_referencia}
                onChange={e => setFormData({ ...formData, mes_referencia: Number(e.target.value) })}
              >
                {meses.map((mes, idx) => (
                  <option key={idx} value={idx + 1}>{mes}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ano</label>
              <select
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                value={formData.ano_referencia}
                onChange={e => setFormData({ ...formData, ano_referencia: Number(e.target.value) })}
              >
                {anos.map(ano => (
                  <option key={ano} value={ano}>{ano}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Número do Processo SEI</label>
            <input
              type="text"
              required
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              placeholder="Ex: 00000.00000/2025-00"
              value={formData.numero_processo_sei}
              onChange={e => setFormData({ ...formData, numero_processo_sei: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              value={formData.status}
              onChange={e => setFormData({ ...formData, status: e.target.value as any })}
            >
              <option value="Em Aberto">Em Aberto</option>
              <option value="Em Andamento">Em Andamento</option>
              <option value="Finalizado">Finalizado</option>
              <option value="Cancelado">Cancelado</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição Resumida (Opcional)</label>
            <textarea
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              rows={3}
              placeholder="Ex: Execução de serviços de limpeza..."
              value={formData.descricao_servicos}
              onChange={e => setFormData({ ...formData, descricao_servicos: e.target.value })}
            />
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg mr-2"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {loading ? 'Salvando...' : 'Salvar Processo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProcessoMensalForm;