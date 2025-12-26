import { Plus } from 'lucide-react';

const Dashboard = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Visão Geral</h1>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Novo Contrato
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card Exemplo 1 */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500">Contratos Ativos</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">12</p>
          <div className="mt-4 flex items-center text-sm text-green-600">
            <span>+2 novos este mês</span>
          </div>
        </div>

        {/* Card Exemplo 2 */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500">Valor Total Executado</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">R$ 1.2M</p>
          <div className="mt-4 flex items-center text-sm text-gray-600">
            <span>45% do orçamento anual</span>
          </div>
        </div>

        {/* Card Exemplo 3 */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500">Alertas Pendentes</h3>
          <p className="text-3xl font-bold text-red-600 mt-2">3</p>
          <div className="mt-4 flex items-center text-sm text-red-600">
            <span>Requer atenção imediata</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Contratos Recentes</h3>
        </div>
        <div className="p-6 text-center text-gray-500">
          <p>Nenhum contrato cadastrado ainda.</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
