import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Shield, UserCog, Search, UserPlus, X, Loader2, Edit2, Trash2 } from 'lucide-react';
import { Profile } from '../types';

const Usuarios = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nome: '',
    username: '',
    role: 'fiscal' as 'diretor' | 'gerente' | 'fiscal',
    manager_id: ''
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

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

  const handleOpenCreate = () => {
    setIsEditMode(false);
    setFormData({
      email: '',
      password: '',
      nome: '',
      username: '',
      role: 'fiscal',
      manager_id: ''
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (profile: Profile) => {
    setIsEditMode(true);
    setSelectedUser(profile);
    setFormData({
      email: '', // Email not editable directly here usually, but keeping for display if needed
      password: '', // Password change optional
      nome: profile.nome,
      username: profile.username || '',
      role: profile.role,
      manager_id: profile.manager_id || ''
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const validateForm = () => {
    if (!formData.nome.trim()) return 'Nome é obrigatório.';
    if (!formData.username.trim()) return 'Nome de usuário é obrigatório.';
    if (formData.username.includes(' ')) return 'Nome de usuário não pode conter espaços.';
    
    if (!isEditMode) {
      if (!formData.email.trim()) return 'E-mail é obrigatório.';
      if (!formData.email.includes('@')) return 'E-mail inválido.';
      if (!formData.password || formData.password.length < 6) return 'Senha deve ter no mínimo 6 caracteres.';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const error = validateForm();
    if (error) {
      setFormError(error);
      return;
    }

    setFormLoading(true);
    setFormError('');

    try {
      if (isEditMode && selectedUser) {
        // Update Logic
        const updates: any = {
          nome: formData.nome,
          username: formData.username,
          role: formData.role,
          manager_id: formData.manager_id || null
        };

        const { error: updateError } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', selectedUser.id);

        if (updateError) throw updateError;

        setProfiles(profiles.map(p => p.id === selectedUser.id ? { ...p, ...updates } : p));
        alert('Usuário atualizado com sucesso!');
      } else {
        // Create Logic (Simulation for MVP without backend functions)
        // Check if username exists locally first
        if (profiles.some(p => p.username === formData.username)) {
          throw new Error('Nome de usuário já existe.');
        }

        alert('Nota: Para criar usuários reais sem deslogar o admin, seria necessário uma Edge Function (Backend). \n\nNesta demonstração, simularemos a criação do perfil visualmente e salvaremos no banco de dados.');
        
        const fakeId = crypto.randomUUID();
        const newProfile: Profile = {
          id: fakeId,
          user_id: fakeId,
          nome: formData.nome,
          username: formData.username,
          role: formData.role,
          manager_id: formData.manager_id || undefined,
          created_at: new Date().toISOString()
        };

        // Insert into profiles to persist metadata (Auth user won't work from client without logout)
        const { error: insertError } = await supabase
          .from('profiles')
          .insert(newProfile);

        if (insertError) throw insertError;

        setProfiles([...profiles, newProfile]);
        alert('Usuário criado com sucesso!');
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const filteredProfiles = profiles.filter(p => 
    p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.username && p.username.toLowerCase().includes(searchTerm.toLowerCase()))
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
        
        <button
          onClick={handleOpenCreate}
          className="flex items-center justify-center px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg shadow-sm transition-colors font-medium"
        >
          <UserPlus className="h-5 w-5 mr-2" />
          Novo Usuário
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome ou usuário..."
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
                <th className="px-6 py-4 font-semibold text-gray-900">Nome / Usuário</th>
                <th className="px-6 py-4 font-semibold text-gray-900">Cargo (Permissão)</th>
                <th className="px-6 py-4 font-semibold text-gray-900">Gestor Responsável</th>
                <th className="px-6 py-4 font-semibold text-gray-900 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProfiles.map((profile) => (
                <tr key={profile.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{profile.nome}</div>
                    {profile.username && (
                      <div className="text-xs text-gray-500">@{profile.username}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${profile.role === 'diretor' ? 'bg-purple-100 text-purple-800' :
                        profile.role === 'gerente' ? 'bg-blue-100 text-blue-800' :
                        'bg-green-100 text-green-800'}`}>
                      {profile.role.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-gray-500">
                      {profiles.find(p => p.id === profile.manager_id)?.nome || '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleOpenEdit(profile)}
                      className="text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1 hover:bg-blue-50 px-2 py-1 rounded-md transition-colors"
                    >
                      <Edit2 className="h-4 w-4" />
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">
                {isEditMode ? 'Editar Usuário' : 'Novo Usuário'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors rounded-full p-1 hover:bg-gray-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-start gap-2">
                  <span className="font-bold">Erro:</span> {formError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome Completo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  value={formData.nome}
                  onChange={(e) => setFormData({...formData, nome: e.target.value})}
                  placeholder="Ex: João Silva"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome de Usuário (Login) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">@</span>
                  <input
                    type="text"
                    className="w-full pl-7 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value.toLowerCase().replace(/\s/g, '')})}
                    placeholder="joaosilva"
                  />
                </div>
              </div>

              {!isEditMode && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      E-mail <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      placeholder="joao@gov.br"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Senha Temporária <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      placeholder="••••••••"
                    />
                    <p className="text-xs text-gray-500 mt-1">Mínimo de 6 caracteres</p>
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cargo <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value as any})}
                  >
                    <option value="fiscal">Fiscal</option>
                    <option value="gerente">Gerente</option>
                    <option value="diretor">Diretor</option>
                  </select>
                </div>

                {formData.role === 'fiscal' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Gestor
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      value={formData.manager_id}
                      onChange={(e) => setFormData({...formData, manager_id: e.target.value})}
                    >
                      <option value="">-- Selecione --</option>
                      {gerentes.map(g => (
                        <option key={g.id} value={g.id}>{g.nome}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="pt-4 flex gap-3 border-t border-gray-50 mt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 font-medium flex items-center justify-center transition-colors shadow-sm disabled:opacity-70"
                >
                  {formLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (isEditMode ? 'Salvar Alterações' : 'Criar Usuário')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Usuarios;
