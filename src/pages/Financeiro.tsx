import { useState, useEffect } from 'react';
import { Plus, Filter, Wallet, FileText, CheckCircle, TrendingDown, DollarSign, Eye, Pencil, Trash2, Calendar, Archive } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Contrato, ExecucaoFinanceira, ProcessoExecucaoMensal } from '../types';
import FinanceiroForm from '../components/FinanceiroForm';
import ProcessoMensalForm from '../components/ProcessoMensalForm';

const Financeiro = () => {
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [selectedContratoId, setSelectedContratoId] = useState<string>('');
  const [processos, setProcessos] = useState<ProcessoExecucaoMensal[]>([]);
  const [selectedProcesso, setSelectedProcesso] = useState<ProcessoExecucaoMensal | null>(null);
  
  // Detalhes do Processo (Lançamentos)
  const [lancamentos, setLancamentos] = useState<ExecucaoFinanceira[]>([]);
  
  const [loading, setLoading] = useState(false);
  
  // Modais
  const [isProcessoFormOpen, setIsProcessoFormOpen] = useState(false);
  const [isLancamentoFormOpen, setIsLancamentoFormOpen] = useState(false);
  const [editingProcesso, setEditingProcesso] = useState<ProcessoExecucaoMensal | undefined>(undefined);
  
  // Estados para edição de lançamentos
  const [selectedLancamento, setSelectedLancamento] = useState<ExecucaoFinanceira | undefined>(undefined);
  const [isViewMode, setIsViewMode] = useState(false);

  // View State: 'list' (Processos) or 'detail' (Processo Específico)
  const [viewState, setViewState] = useState<'list' | 'detail'>('list');

  // Totais do Resumo (Do Processo ou Geral)
  const [resumo, setResumo] = useState({
    totalEmpenhado: 0,
    totalLiquidado: 0,
    totalPago: 0,
    saldoEmpenho: 0,
    totalRetencoes: 0,
    totalEstornado: 0
  });

  useEffect(() => {
    fetchContratos();
  }, []);

  useEffect(() => {
    if (selectedContratoId) {
      fetchProcessos(selectedContratoId);
      setViewState('list');
      setSelectedProcesso(null);
    } else {
      setProcessos([]);
      setLancamentos([]);
      resetResumo();
    }
  }, [selectedContratoId]);

  const fetchContratos = async () => {
    const { data } = await supabase
      .from('contratos')
      .select('id, numero_contrato, empresa_contratada, nome_exibicao, numero_processo')
      .eq('alerta_ativo', true) // Apenas contratos ativos
      .order('nome_exibicao', { ascending: true });
    
    if (data) setContratos(data as any);
  };

  const fetchProcessos = async (contratoId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('processos_execucao_mensal')
      .select('*')
      .eq('contrato_id', contratoId)
      .order('ano_referencia', { ascending: false })
      .order('mes_referencia', { ascending: false });

    if (error) {
      console.error('Erro ao buscar processos:', error);
    } else {
      setProcessos(data || []);
    }
    setLoading(false);
  };

  const fetchLancamentosProcesso = async (processoId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('execucoes_financeiras')
      .select('*')
      .eq('processo_execucao_id', processoId)
      .order('data_lancamento', { ascending: true }); // Ordem cronológica

    if (error) {
      console.error('Erro ao buscar lançamentos:', error);
    } else {
      setLancamentos(data || []);
      calculateResumo(data || []);
    }
    setLoading(false);
  };

  const calculateResumo = (data: ExecucaoFinanceira[]) => {
    const totalEmpenhado = data.reduce((acc, curr) => acc + (curr.valor_empenho || 0), 0);
    const totalLiquidado = data.reduce((acc, curr) => acc + (curr.valor_liquidacao || 0), 0);
    const totalEstornado = data.reduce((acc, curr) => acc + (curr.estorno_valor || 0), 0);
    const totalRetencoes = data.reduce((acc, curr) => acc + (curr.valor_retencoes || 0) + (curr.valor_iss || 0) + (curr.valor_glosa || 0), 0);

    setResumo({
      totalEmpenhado,
      totalLiquidado,
      totalPago: totalLiquidado - totalRetencoes, // Aproximação: Líquido é o que foi pago
      saldoEmpenho: totalEmpenhado - totalLiquidado - totalEstornado,
      totalRetencoes,
      totalEstornado
    });
  };

  const resetResumo = () => {
    setResumo({
      totalEmpenhado: 0,
      totalLiquidado: 0,
      totalPago: 0,
      saldoEmpenho: 0,
      totalRetencoes: 0,
      totalEstornado: 0
    });
  };

  const handleDeleteProcesso = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este Processo Mensal? Todos os lançamentos vinculados serão removidos.')) return;

    try {
        const { error } = await supabase.from('processos_execucao_mensal').delete().eq('id', id);
        if (error) throw error;
        fetchProcessos(selectedContratoId);
    } catch (err: any) {
        alert('Erro ao excluir processo: ' + err.message);
    }
  };

  const handleDeleteLancamento = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este lançamento?')) return;

    try {
      const { error } = await supabase
        .from('execucoes_financeiras')
        .delete()
        .eq('id', id);

      if (error) throw error;

      if (selectedProcesso) {
        fetchLancamentosProcesso(selectedProcesso.id);
      }
    } catch (error: any) {
      console.error('Erro ao excluir:', error);
      alert('Erro ao excluir lançamento: ' + error.message);
    }
  };

  // Handlers UI
  const handleOpenProcesso = (processo: ProcessoExecucaoMensal) => {
    setSelectedProcesso(processo);
    setViewState('detail');
    fetchLancamentosProcesso(processo.id);
  };

  const handleBackToList = () => {
    setViewState('list');
    setSelectedProcesso(null);
    fetchProcessos(selectedContratoId); // Refresh list
  };

  const handleNewLancamento = () => {
    setSelectedLancamento(undefined);
    setIsViewMode(false);
    setIsLancamentoFormOpen(true);
  };

  const handleEditLancamento = (lancamento: ExecucaoFinanceira) => {
    setSelectedLancamento(lancamento);
    setIsViewMode(false);
    setIsLancamentoFormOpen(true);
  };

  const handleViewLancamento = (lancamento: ExecucaoFinanceira) => {
    setSelectedLancamento(lancamento);
    setIsViewMode(true);
    setIsLancamentoFormOpen(true);
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  const getMonthName = (month: number) => {
    const names = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return names[month - 1] || '';
  };

  return (
    <div className="space-y-6">
      {/* Header & Selector */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Execução Financeira</h1>
          <p className="text-sm text-gray-500">Gestão de Despesas Mensais e Processos de Pagamento</p>
        </div>
        
        <div className="w-full md:w-96">
          <select
            value={selectedContratoId}
            onChange={(e) => setSelectedContratoId(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
          >
            <option value="">-- Selecione um Contrato --</option>
            {contratos.map(c => {
              const nome = c.nome_exibicao && c.nome_exibicao.trim() !== '' ? c.nome_exibicao : c.empresa_contratada;
              return (
                <option key={c.id} value={c.id}>
                  {nome} | Contrato: {c.numero_contrato || 'S/N'}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {!selectedContratoId ? (
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl border border-dashed border-gray-300">
          <Wallet className="h-12 w-12 text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">Selecione um contrato acima para visualizar a execução financeira.</p>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          
          {/* VISÃO LISTA DE PROCESSOS MENSAIS */}
          {viewState === 'list' && (
            <>
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-800">Competências (Meses)</h3>
                <button 
                  onClick={() => { setEditingProcesso(undefined); setIsProcessoFormOpen(true); }}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Nova Execução Mensal
                </button>
              </div>

              {loading ? (
                 <div className="p-12 text-center text-gray-500">Carregando processos...</div>
              ) : processos.length === 0 ? (
                 <div className="p-12 text-center text-gray-500 bg-white rounded-xl border border-gray-200">
                    <Archive className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                    <p>Nenhuma execução mensal registrada.</p>
                    <p className="text-sm">Clique em "Nova Execução Mensal" para iniciar um processo SEI.</p>
                 </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {processos.map(proc => (
                    <div key={proc.id} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow p-6 relative group">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                    <Calendar className="h-5 w-5 text-blue-600" />
                                    {getMonthName(proc.mes_referencia)} / {proc.ano_referencia}
                                </h4>
                                <p className="text-sm text-gray-500 mt-1">SEI: {proc.numero_processo_sei || 'Não informado'}</p>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                proc.status === 'Finalizado' ? 'bg-green-100 text-green-700' :
                                proc.status === 'Cancelado' ? 'bg-red-100 text-red-700' :
                                'bg-blue-100 text-blue-700'
                            }`}>
                                {proc.status}
                            </span>
                        </div>
                        
                        <div className="text-sm text-gray-600 mb-4 line-clamp-2">
                            {proc.descricao_servicos || 'Sem descrição de serviços.'}
                        </div>

                        <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
                            <button 
                                onClick={() => handleOpenProcesso(proc)}
                                className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center gap-1"
                            >
                                <Eye className="h-4 w-4" /> Abrir Dossiê
                            </button>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => { setEditingProcesso(proc); setIsProcessoFormOpen(true); }}
                                    className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-full"
                                    title="Editar Processo"
                                >
                                    <Pencil className="h-4 w-4" />
                                </button>
                                <button 
                                    onClick={() => handleDeleteProcesso(proc.id)}
                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full"
                                    title="Excluir Processo"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* VISÃO DETALHE DO PROCESSO (DOSSIÊ) */}
          {viewState === 'detail' && selectedProcesso && (
            <>
              <button 
                onClick={handleBackToList}
                className="mb-4 text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1"
              >
                ← Voltar para Lista de Competências
              </button>

              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-6">
                 <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            {getMonthName(selectedProcesso.mes_referencia)} / {selectedProcesso.ano_referencia}
                        </h2>
                        <p className="text-gray-500">Processo SEI: <span className="font-medium text-gray-900">{selectedProcesso.numero_processo_sei}</span></p>
                    </div>
                    <div className="flex gap-3">
                        <div className="text-right">
                            <p className="text-xs text-gray-500 uppercase">Total Liquidado</p>
                            <p className="text-xl font-bold text-green-600">{formatCurrency(resumo.totalLiquidado)}</p>
                        </div>
                        <div className="text-right pl-4 border-l border-gray-200">
                            <p className="text-xs text-gray-500 uppercase">Total Pago</p>
                            <p className="text-xl font-bold text-blue-600">{formatCurrency(resumo.totalPago)}</p>
                        </div>
                    </div>
                 </div>
              </div>

              {/* Resumo Cards Compactos */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                 <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                    <span className="text-xs text-blue-700 font-bold uppercase">Empenhado</span>
                    <div className="text-lg font-bold text-blue-900">{formatCurrency(resumo.totalEmpenhado)}</div>
                 </div>
                 <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
                    <span className="text-xs text-amber-700 font-bold uppercase">Saldo Empenho</span>
                    <div className="text-lg font-bold text-amber-900">{formatCurrency(resumo.saldoEmpenho)}</div>
                 </div>
                 <div className="bg-red-50 p-3 rounded-lg border border-red-100">
                    <span className="text-xs text-red-700 font-bold uppercase">Retenções</span>
                    <div className="text-lg font-bold text-red-900">{formatCurrency(resumo.totalRetencoes)}</div>
                 </div>
                 <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <span className="text-xs text-gray-600 font-bold uppercase">Estornos</span>
                    <div className="text-lg font-bold text-gray-800">{formatCurrency(resumo.totalEstornado)}</div>
                 </div>
              </div>

              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-800">Documentos do Processo</h3>
                <button 
                  onClick={handleNewLancamento}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                >
                  <Plus className="h-4 w-4" />
                  Adicionar Documento
                </button>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-medium">
                        <tr>
                        <th className="px-4 py-3">Data</th>
                        <th className="px-4 py-3">Tipo</th>
                        <th className="px-4 py-3">Doc / SEI</th>
                        <th className="px-4 py-3 text-right">Valor</th>
                        <th className="px-4 py-3 text-right">Líquido</th>
                        <th className="px-4 py-3 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {lancamentos.map((lanc) => (
                        <tr key={lanc.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">{formatDate(lanc.data_lancamento)}</td>
                            <td className="px-4 py-3">
                                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-bold 
                                    ${lanc.is_pedido_empenho ? 'bg-yellow-100 text-yellow-800' :
                                    lanc.tipo_documento === 'Empenho' ? 'bg-blue-100 text-blue-700' : 
                                    lanc.tipo_documento === 'Liquidação' ? 'bg-green-100 text-green-700' : 
                                    lanc.tipo_documento === 'Estorno' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                                    {lanc.is_pedido_empenho ? 'Pedido' : lanc.tipo_documento}
                                </span>
                            </td>
                            <td className="px-4 py-3 font-medium text-gray-700">
                                {lanc.numero_empenho || lanc.numero_liquidacao || lanc.numero_nf || lanc.pedido_empenho_sei || '-'}
                            </td>
                            <td className="px-4 py-3 text-right font-medium">
                                {formatCurrency(lanc.valor_empenho || lanc.valor_liquidacao || lanc.valor_nf || 0)}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-gray-900">
                                {formatCurrency(lanc.valor_liquido || 0)}
                            </td>
                            <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-2">
                                    <button onClick={() => handleViewLancamento(lanc)} className="p-1 text-gray-400 hover:text-blue-600"><Eye className="h-4 w-4"/></button>
                                    <button onClick={() => handleEditLancamento(lanc)} className="p-1 text-gray-400 hover:text-amber-600"><Pencil className="h-4 w-4"/></button>
                                    <button onClick={() => handleDeleteLancamento(lanc.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="h-4 w-4"/></button>
                                </div>
                            </td>
                        </tr>
                        ))}
                        {lancamentos.length === 0 && (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-gray-500">
                                    Nenhum documento lançado neste processo.
                                </td>
                            </tr>
                        )}
                    </tbody>
                    </table>
                </div>
              </div>
            </>
          )}

        </div>
      )}

      {/* MODAL DE PROCESSO MENSAL */}
      {isProcessoFormOpen && selectedContratoId && (
        <ProcessoMensalForm
            onClose={() => setIsProcessoFormOpen(false)}
            onSuccess={() => {
                fetchProcessos(selectedContratoId);
                setEditingProcesso(undefined);
            }}
            contratoId={selectedContratoId}
            processo={editingProcesso}
        />
      )}

      {/* MODAL DE LANÇAMENTO FINANCEIRO */}
      {isLancamentoFormOpen && selectedContratoId && selectedProcesso && (
        <FinanceiroForm 
          onClose={() => setIsLancamentoFormOpen(false)}
          onSuccess={() => fetchLancamentosProcesso(selectedProcesso.id)}
          contratoId={selectedContratoId}
          processoId={selectedProcesso.id}
          lancamento={selectedLancamento}
          readOnly={isViewMode}
        />
      )}
    </div>
  );
};

export default Financeiro;
