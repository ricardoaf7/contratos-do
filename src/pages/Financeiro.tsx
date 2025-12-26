import { Construction } from 'lucide-react';

const Financeiro = () => {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center">
      <div className="bg-blue-50 p-6 rounded-full mb-4">
        <Construction className="h-12 w-12 text-blue-600" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Execução Financeira</h2>
      <p className="text-gray-500 max-w-md">
        O módulo de controle financeiro está sendo desenvolvido. Em breve você poderá lançar empenhos, notas fiscais e liquidações aqui.
      </p>
    </div>
  );
};

export default Financeiro;
