import { useState, useEffect } from 'react';
import { Plus, Search, Filter, Eye, Edit, AlertTriangle, Clock, Calendar, AlertCircle, Trash2, Archive, Printer } from 'lucide-react';
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

  const handleDelete = async (id: string) => {
    if (!confirm('ATENÇÃO: Tem certeza que deseja EXCLUIR este contrato? Todo o histórico de aditivos será perdido. Esta ação não pode ser desfeita.')) return;
    
    try {
      const { error } = await supabase.from('contratos').delete().eq('id', id);
      if (error) throw error;
      fetchContratos();
      alert('Contrato excluído com sucesso.');
    } catch (err: any) {
      alert('Erro ao excluir: ' + err.message);
    }
  };

  const handleFinalize = async (contrato: Contrato) => {
    if (!confirm('Deseja realmente FINALIZAR este contrato? Ele deixará de ser monitorado como ativo, mas permanecerá no histórico.')) return;

    try {
      const { error } = await supabase
        .from('contratos')
        .update({ alerta_ativo: false })
        .eq('id', contrato.id);
      
      if (error) throw error;
      fetchContratos();
      alert('Contrato finalizado com sucesso.');
    } catch (err: any) {
      alert('Erro ao finalizar: ' + err.message);
    }
  };

  const handlePrint = async (contrato: Contrato) => {
    // 1. Fetch Aditivos for this contract
    const { data: aditivos } = await supabase
      .from('aditivos')
      .select('*')
      .eq('contrato_id', contrato.id)
      .order('data_assinatura', { ascending: true });

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const deadline = calculateDeadlineInfo(contrato.data_vencimento, contrato.data_assinatura);

    // Generate rows for aditivos
    const aditivosRows = aditivos && aditivos.length > 0 
      ? aditivos.map(ad => `
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${ad.tipo} ${ad.tipo === 'Aditivo' ? ad.numero_aditivo : ''}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${formatDate(ad.data_assinatura)}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${ad.descricao}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${ad.novo_valor_mensal ? formatCurrency(ad.novo_valor_mensal) : '-'}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${ad.novo_vencimento ? formatDate(ad.novo_vencimento) : '-'}</td>
          </tr>
        `).join('')
      : `<tr><td colspan="5" style="padding: 15px; text-align: center; color: #6b7280; font-style: italic;">Nenhum registro de alteração encontrado.</td></tr>`;

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Ficha do Contrato - ${contrato.numero_contrato}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.5; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
          h1 { color: #2563eb; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; }
          h2 { font-size: 16px; color: #4b5563; margin-top: 25px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px; }
          .field { margin-bottom: 5px; }
          .label { font-weight: bold; font-size: 12px; color: #6b7280; display: block; }
          .value { font-size: 14px; }
          .box { background: #f9fafb; padding: 15px; border-radius: 8px; margin-top: 10px; }
          .tag { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: bold; }
          .tag-active { background: #d1fae5; color: #065f46; }
          .tag-inactive { background: #f3f4f6; color: #374151; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px; }
          th { text-align: left; background: #f9fafb; padding: 8px; font-weight: bold; color: #4b5563; border-bottom: 1px solid #e5e7eb; }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div style="text-align: right; margin-bottom: 20px;">
          <span class="tag ${contrato.alerta_ativo ? 'tag-active' : 'tag-inactive'}">
            ${contrato.alerta_ativo ? 'ATIVO' : 'FINALIZADO/INATIVO'}
          </span>
        </div>

        <h1>Contrato Nº ${contrato.numero_contrato || 'S/N'}</h1>
        
        <div class="grid">
          <div class="field">
            <span class="label">Processo Administrativo</span>
            <span class="value">${contrato.numero_processo}</span>
          </div>
          <div class="field">
            <span class="label">Modalidade</span>
            <span class="value">${contrato.modalidade} ${contrato.numero_modalidade || ''}</span>
          </div>
        </div>

        <div class="field">
          <span class="label">Empresa Contratada</span>
          <span class="value"><strong>${contrato.empresa_contratada}</strong></span>
        </div>
        
        <div class="field">
          <span class="label">Objeto</span>
          <div class="value" style="white-space: pre-wrap;">${contrato.objeto}</div>
        </div>

        <h2>Valores e Vigência</h2>
        <div class="grid">
          <div class="field">
            <span class="label">Valor Mensal Atual</span>
            <span class="value">${formatCurrency(contrato.valor_mensal)}</span>
          </div>
          <div class="field">
            <span class="label">Valor Anual Atual</span>
            <span class="value">${formatCurrency(contrato.valor_anual)}</span>
          </div>
          <div class="field">
            <span class="label">Data de Assinatura</span>
            <span class="value">${formatDate(contrato.data_assinatura)}</span>
          </div>
          <div class="field">
            <span class="label">Vencimento Atual</span>
            <span class="value"><strong>${formatDate(contrato.data_vencimento)}</strong></span>
          </div>
        </div>

        <h2>Histórico de Alterações (Aditivos e Apostilamentos)</h2>
        <table>
          <thead>
            <tr>
              <th width="15%">Tipo/Nº</th>
              <th width="15%">Data</th>
              <th width="40%">Descrição</th>
              <th width="15%" style="text-align: right;">Novo Mensal</th>
              <th width="15%" style="text-align: right;">Novo Venc.</th>
            </tr>
          </thead>
          <tbody>
            ${aditivosRows}
          </tbody>
        </table>

        <div class="box" style="margin-top: 20px;">
          <div class="grid">
             <div class="field">
               <span class="label">Limite Legal (60 meses)</span>
               <span class="value">${deadline?.limitLegalDate?.toLocaleDateString('pt-BR') || '-'}</span>
             </div>
             <div class="field">
               <span class="label">Prazo Limite para Renovação</span>
               <span class="value">${deadline?.limitRequestDate?.toLocaleDateString('pt-BR') || '-'}</span>
             </div>
          </div>
          ${contrato.renovacao_solicitada !== undefined ? `
            <div class="field" style="margin-top: 10px; border-top: 1px dashed #ddd; padding-top: 10px;">
              <span class="label">Status da Renovação</span>
              <span class="value">
                ${contrato.renovacao_solicitada 
                  ? `✅ Solicitada em ${formatDate(contrato.data_solicitacao_renovacao || '')} (SEI: ${contrato.processo_sei_renovacao || '-'})` 
                  : `❌ Não Iniciada. Motivo: ${contrato.justificativa_nao_renovacao || '-'}`}
              </span>
            </div>
          ` : ''}
        </div>

        <div style="margin-top: 40px; font-size: 12px; color: #9ca3af; text-align: center;">
          Documento gerado automaticamente pelo Sistema de Gestão de Contratos em ${new Date().toLocaleString('pt-BR')}
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
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

  const calculateDeadlineInfo = (data_vencimento: string, data_assinatura: string) => {
    if (!data_vencimento) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const parts = data_vencimento.split('-');
    const vencimento = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    
    // Days diff
    const diffTime = vencimento.getTime() - today.getTime();
    const daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Renewal Limit (120 days before expiration)
    const limitRequestDate = new Date(vencimento);
    limitRequestDate.setDate(limitRequestDate.getDate() - 120);

    // Legal Limit (60 months from start)
    let limitLegalDate = null;
    if (data_assinatura) {
        const startParts = data_assinatura.split('-');
        const start = new Date(Number(startParts[0]), Number(startParts[1]) - 1, Number(startParts[2]));
        limitLegalDate = new Date(start);
        limitLegalDate.setMonth(limitLegalDate.getMonth() + 60);
    }
    
    const isCritical = daysDiff <= 120;
    const isExpired = daysDiff < 0;
    const isPastRenewalDeadline = today > limitRequestDate;

    return { daysDiff, limitRequestDate, limitLegalDate, isCritical, isExpired, isPastRenewalDeadline };
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
                  <th className="px-6 py-4 font-semibold text-gray-900 w-[220px]">Contrato / Processo</th>
                  <th className="px-6 py-4 font-semibold text-gray-900 min-w-[250px]">Objeto</th>
                  <th className="px-6 py-4 font-semibold text-gray-900 w-[250px]">Gestão de Prazos</th>
                  <th className="px-6 py-4 font-semibold text-gray-900 text-right w-[130px]">Valor Mensal</th>
                  <th className="px-6 py-4 font-semibold text-gray-900 text-right w-[130px]">Valor Anual</th>
                  <th className="px-6 py-4 font-semibold text-gray-900 text-center w-[80px]">Status</th>
                  <th className="px-6 py-4 font-semibold text-gray-900 text-right w-[140px]">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredContratos.map((contrato) => {
                  const deadline = calculateDeadlineInfo(contrato.data_vencimento, contrato.data_assinatura);
                  
                  return (
                  <tr key={contrato.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 align-top">
                      <div className="font-bold text-gray-900 text-base">
                         {contrato.nome_exibicao || contrato.empresa_contratada}
                      </div>
                      <div className="text-blue-600 font-medium mt-1 flex items-center gap-1">
                         Nº {contrato.numero_contrato || 'S/N'}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Proc: {contrato.numero_processo}
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top">
                       <p className="text-gray-600 line-clamp-3" title={contrato.objeto}>
                          {contrato.objeto}
                       </p>
                    </td>
                    <td className="px-6 py-4 align-top">
                      {deadline && (
                        <div className="space-y-2">
                           {/* Vencimento e Dias Restantes */}
                           <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-500 flex items-center gap-1">
                                <Calendar className="h-3 w-3" /> Vencimento:
                              </span>
                              <span className={`font-medium ${deadline.isExpired ? 'text-red-600' : 'text-gray-900'}`}>
                                {formatDate(contrato.data_vencimento)}
                              </span>
                           </div>
                           
                           <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-500 flex items-center gap-1">
                                <Clock className="h-3 w-3" /> Restam:
                              </span>
                              <span className={`font-bold ${deadline.isCritical ? 'text-orange-600' : 'text-green-600'}`}>
                                {deadline.daysDiff} dias
                              </span>
                           </div>

                           {/* Status Renovação */}
                           <div className="pt-2 border-t border-gray-100 mt-2">
                              {deadline.isPastRenewalDeadline ? (
                                 <div className="flex items-center gap-1.5">
                                    {contrato.renovacao_solicitada === true ? (
                                       <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700">
                                          Renovação Solicitada
                                       </span>
                                    ) : contrato.renovacao_solicitada === false ? (
                                       <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600">
                                          Renovação Não Iniciada
                                       </span>
                                    ) : (
                                       <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700 animate-pulse">
                                          <AlertCircle className="h-3 w-3 mr-1" />
                                          Ação Necessária
                                       </span>
                                    )}
                                 </div>
                              ) : (
                                 <div className="text-[10px] text-gray-500">
                                    Solicitar aditivo até: <span className="font-medium text-gray-700">{deadline.limitRequestDate.toLocaleDateString('pt-BR')}</span>
                                 </div>
                              )}
                           </div>
                           
                           {/* Limite Legal */}
                           {deadline.limitLegalDate && (
                             <div className="text-[10px] text-gray-400 mt-1" title="Limite legal de 60 meses">
                                Max: {deadline.limitLegalDate.toLocaleDateString('pt-BR')}
                             </div>
                           )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-gray-600 align-top">
                      {formatCurrency(contrato.valor_mensal)}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-gray-900 align-top">
                      {formatCurrency(contrato.valor_anual)}
                    </td>
                    <td className="px-6 py-4 text-center align-top">
                      {contrato.alerta_ativo ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Finalizado
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right align-top">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={() => handlePrint(contrato)}
                          className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors" 
                          title="Imprimir Ficha"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                        
                        <button className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Visualizar Detalhes">
                          <Eye className="h-4 w-4" />
                        </button>
                        
                        {canEdit && (
                          <>
                            <button 
                              onClick={() => handleEdit(contrato)}
                              className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" 
                              title="Editar Contrato"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            {contrato.alerta_ativo && (
                              <button 
                                onClick={() => handleFinalize(contrato)}
                                className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" 
                                title="Finalizar Contrato"
                              >
                                <Archive className="h-4 w-4" />
                              </button>
                            )}
                            <button 
                              onClick={() => handleDelete(contrato.id)}
                              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" 
                              title="Excluir Contrato"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );})}
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
