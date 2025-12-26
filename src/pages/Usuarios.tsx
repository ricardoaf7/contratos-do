import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Shield, UserCog, Search } from 'lucide-react';
import { Profile } from '../types';

const Usuarios = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    checkUserRole();
    fetchProfiles();
  }, []);

  const checkUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      setCurrentUserRole(data?.role || '');
    }
  };

  const fetchProfiles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('nome');
    
    if (error) console.error('Error fetching profiles:', error);
    else setProfiles(data || []);
    setLoading(false);
  };

  const handleUpdateProfile = async (id: string, updates: Partial<Profile>) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      
      setProfiles(profiles.map(p => p.id === id ? { ...p, ...updates } : p));
      setEditingId(null);
      alert('Usuário atualizado com sucesso!');
    } catch (error: any) {
      alert('Erro ao atualizar: ' + error.message);
    }
  };

  const filteredProfiles = profiles.filter(p => 
    p.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const gerentes = profiles.filter(p => p.role === 'gerente' || p.role === 'diretor');

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (currentUserRole !== 'diretor') {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <Shield className="h-12 w-12 mb-4 text-gray-300" />
        <p>Acesso restrito a Diretores.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestão de Equipe</h1>
          <p className="text-sm text-gray-500 mt-1">Gerencie permissões e hierarquia</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar usuário..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 font-semibold text-gray-900">Nome</th>
                <th className="px-6 py-4 font-semibold text-gray-900">Cargo (Permissão)</th>
                <th className="px-6 py-4 font-semibold text-gray-900">Gestor Responsável</th>
                <th className="px-6 py-4 font-semibold text-gray-900 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProfiles.map((profile) => (
                <tr key={profile.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {profile.nome}
                  </td>
                  <td className="px-6 py-4">
                    {editingId === profile.id ? (
                      <select
                        className="border border-gray-300 rounded px-2 py-1"
                        value={profile.role}
                        onChange={(e) => handleUpdateProfile(profile.id, { role: e.target.value as any })}
                      >
                        <option value="diretor">Diretor</option>
                        <option value="gerente">Gerente</option>
                        <option value="fiscal">Fiscal</option>
                      </select>
                    ) : (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${profile.role === 'diretor' ? 'bg-purple-100 text-purple-800' :
                          profile.role === 'gerente' ? 'bg-blue-100 text-blue-800' :
                          'bg-green-100 text-green-800'}`}>
                        {profile.role.toUpperCase()}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {editingId === profile.id && profile.role === 'fiscal' ? (
                      <select
                        className="border border-gray-300 rounded px-2 py-1 w-full"
                        value={profile.manager_id || ''}
                        onChange={(e) => handleUpdateProfile(profile.id, { manager_id: e.target.value || undefined })}
                      >
                        <option value="">-- Sem Gestor --</option>
                        {gerentes.map(g => (
                          <option key={g.id} value={g.id}>{g.nome}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-gray-500">
                        {profiles.find(p => p.id === profile.manager_id)?.nome || '-'}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {editingId === profile.id ? (
                      <button 
                        onClick={() => setEditingId(null)}
                        className="text-gray-500 hover:text-gray-700 text-xs font-medium"
                      >
                        Cancelar
                      </button>
                    ) : (
                      <button 
                        onClick={() => setEditingId(profile.id)}
                        className="text-blue-600 hover:text-blue-800 font-medium flex items-center justify-end gap-1 ml-auto"
                      >
                        <UserCog className="h-4 w-4" />
                        Editar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Usuarios;
