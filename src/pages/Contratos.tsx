import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, AlertCircle, Eye, Edit, Trash2, Database } from 'lucide-react';
import { Contrato } from '../types';
import { supabase } from '../lib/supabase';
import ContractForm from '../components/ContractForm';

const Contratos = () => {
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contrato | undefined>(undefined);
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    fetchContratos();
    checkUserRole();
  }, []);

  const checkUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      setUserRole(data?.role || '');
    }
  };

  const fetchContratos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('contratos')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching contracts:', error);
    } else {
      setContratos(data || []);
    }
    setLoading(false);
  };

  const handleEdit = (contrato: Contrato) => {
    setEditingContract(contrato);
    setIsFormOpen(true);
  };

  const handleNew = () => {
    setEditingContract(undefined);
    setIsFormOpen(true);
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    fetchContratos();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    // Fix timezone offset issue by treating date string as UTC or appending time
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };

  const filteredContratos = contratos.filter(c => 
    c.numero_processo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.empresa_contratada.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.objeto.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const canEdit = userRole === 'diretor' || userRole === 'gerente';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contratos</h1>
          <p className="text-sm text-gray-500 mt-1">Gerencie todos os contratos e seus vencimentos</p>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <button 
              onClick={handleNew}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Novo Contrato
            </button>
          )}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por número, empresa ou objeto..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700">
          <Filter className="h-4 w-4" />
          Filtros
        </button>
      </div>

      {/* Contracts Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            <div className="animate-spin inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mb-2"></div>
            <p>Carregando contratos...</p>
          </div>
        ) : filteredContratos.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <p className="text-lg font-medium text-gray-900 mb-1">Nenhum contrato encontrado</p>
            {canEdit && <p>Clique em "Novo Contrato" para começar.</p>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 font-semibold text-gray-900">Processo / Empresa</th>
                  <th className="px-6 py-4 font-semibold text-gray-900">Objeto</th>
                  <th className="px-6 py-4 font-semibold text-gray-900">Vigência</th>
                  <th className="px-6 py-4 font-semibold text-gray-900 text-right">Valor Anual</th>
                  <th className="px-6 py-4 font-semibold text-gray-900 text-center">Status</th>
                  <th className="px-6 py-4 font-semibold text-gray-900 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredContratos.map((contrato) => (
                  <tr key={contrato.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-blue-600">{contrato.numero_processo}</div>
                      <div className="text-gray-900 font-medium mt-1">{contrato.empresa_contratada}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{contrato.modalidade}</div>
                    </td>
                    <td className="px-6 py-4 max-w-xs truncate" title={contrato.objeto}>
                      {contrato.objeto}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      <div className="flex items-center gap-2">
                        <span className="text-xs">De:</span>
                        <span>{formatDate(contrato.data_assinatura)}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs">Até:</span>
                        <span className={new Date(contrato.data_vencimento) < new Date() ? 'text-red-600 font-medium' : ''}>
                          {formatDate(contrato.data_vencimento)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-gray-900">
                      {formatCurrency(contrato.valor_anual)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {contrato.alerta_ativo ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Inativo
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Visualizar">
                          <Eye className="h-4 w-4" />
                        </button>
                        {canEdit && (
                          <button 
                            onClick={() => handleEdit(contrato)}
                            className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" 
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isFormOpen && (
        <ContractForm 
          onClose={() => setIsFormOpen(false)}
          onSuccess={handleFormSuccess}
          contrato={editingContract}
        />
      )}
    </div>
  );
};

export default Contratos;
