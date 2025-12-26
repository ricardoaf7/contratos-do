import { Construction } from 'lucide-react';

const Relatorios = () => {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center">
      <div className="bg-blue-50 p-6 rounded-full mb-4">
        <Construction className="h-12 w-12 text-blue-600" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Relatórios</h2>
      <p className="text-gray-500 max-w-md">
        O módulo de relatórios está sendo desenvolvido. Em breve você poderá gerar PDFs detalhados dos contratos e execuções.
      </p>
    </div>
  );
};

export default Relatorios;
