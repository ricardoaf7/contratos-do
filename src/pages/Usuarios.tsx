import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Shield, Search, UserPlus, X, Loader2, Edit2, Eye, Trash2, Plus } from 'lucide-react';
import { Profile, Gerencia, Setor } from '../types';

const Usuarios = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [gerencias, setGerencias] = useState<Gerencia[]>([]);
  const [setores, setSetores] = useState<Setor[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isGerenciaModalOpen, setIsGerenciaModalOpen] = useState(false);
  const [isSetorModalOpen, setIsSetorModalOpen] = useState(false);
  
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  
  // Form States
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nome: '',
    username: '',
    role: 'fiscal' as 'diretor' | 'gerente' | 'fiscal',
    manager_id: '', // Deprecated but kept for type compatibility
    gerencia_id: '',
    setor_id: ''
  });

  const [gerenciaForm, setGerenciaForm] = useState({ nome: '' });
  const [setorForm, setSetorForm] = useState({ nome: '', gerencia_id: '' });

  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    checkUserRole();
    fetchData();
  }, []);

  // Monitorar mudança de papel para ajustar campos automaticamente
  useEffect(() => {
    if (formData.role === 'diretor') {
      // Tentar encontrar a "Diretoria de Operações"
      const diretoriaSetor = setores.find(s => s.nome === 'Diretoria de Operações');
      if (diretoriaSetor) {
        setFormData(prev => ({
          ...prev,
          setor_id: diretoriaSetor.id,
          gerencia_id: diretoriaSetor.gerencia_id
        }));
      }
    } else if (formData.role === 'gerente') {
      // Gerente não tem setor, limpar setor_id
      setFormData(prev => ({ ...prev, setor_id: '' }));
    }
  }, [formData.role, setores]);

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

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchProfiles(), fetchGerencias(), fetchSetores()]);
    setLoading(false);
  };

  const fetchProfiles = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('nome');
    if (error) console.error('Error fetching profiles:', error);
    else setProfiles(data || []);
  };

  const fetchGerencias = async () => {
    const { data, error } = await supabase
      .from('gerencias')
      .select('*')
      .order('nome');
    if (error) console.error('Error fetching gerencias:', error);
    else setGerencias(data || []);
  };

  const fetchSetores = async () => {
    const { data, error } = await supabase
      .from('setores')
      .select('*')
      .order('nome');
    if (error) console.error('Error fetching setores:', error);
    else setSetores(data || []);
  };

  const handleOpenCreate = () => {
    setIsEditMode(false);
    setFormData({
      email: '',
      password: '',
      nome: '',
      username: '',
      role: 'fiscal',
      manager_id: '',
      gerencia_id: '',
      setor_id: ''
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (profile: Profile) => {
    setIsEditMode(true);
    setSelectedUser(profile);
    setFormData({
      email: '',
      password: '',
      nome: profile.nome,
      username: profile.username || '',
      role: profile.role,
      manager_id: profile.manager_id || '',
      gerencia_id: profile.gerencia_id || '',
      setor_id: profile.setor_id || ''
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleDeleteUser = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.')) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setProfiles(profiles.filter(p => p.id !== id));
      alert('Usuário excluído com sucesso.');
    } catch (err: any) {
      alert('Erro ao excluir usuário: ' + err.message);
    }
  };

  const validateForm = () => {
    if (!formData.nome.trim()) return 'Nome é obrigatório.';
    if (!formData.username.trim()) return 'Nome de usuário é obrigatório.';
    if (formData.username.includes(' ')) return 'Nome de usuário não pode conter espaços.';
    
    // Regras Específicas por Cargo
    if (formData.role === 'fiscal') {
        if (!formData.gerencia_id) return 'Para fiscais, a Gerência é obrigatória.';
        if (!formData.setor_id) return 'Para fiscais, o Setor é obrigatório.';
    } else if (formData.role === 'gerente') {
        if (!formData.gerencia_id) return 'Para gerentes, a Gerência é obrigatória.';
        // Gerente NÃO deve ter setor
        if (formData.setor_id) return 'Gerentes não devem ser vinculados a um setor específico.';
    } else if (formData.role === 'diretor') {
        // Diretor deve estar vinculado à estrutura da Diretoria
        // Verificamos se o setor selecionado (auto-preenchido) é válido
        if (!formData.setor_id) return 'Diretor deve estar vinculado à Diretoria de Operações (Setor obrigatório).';
    }
    
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
          email: formData.email,
          username: formData.username,
          role: formData.role,
          gerencia_id: formData.gerencia_id || null,
          setor_id: formData.setor_id || null,
          manager_id: null 
        };

        const { error: updateError } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', selectedUser.id);

        if (updateError) throw updateError;

        setProfiles(profiles.map(p => p.id === selectedUser.id ? { ...p, ...updates } : p));
        alert('Usuário atualizado com sucesso!');
      } else {
        // Create Logic via Edge Function
        const { data, error } = await supabase.functions.invoke('create-user', {
          body: {
            email: formData.email,
            password: formData.password,
            nome: formData.nome,
            username: formData.username,
            role: formData.role,
            gerencia_id: formData.gerencia_id || null,
            setor_id: formData.setor_id || null,
            manager_id: null
          }
        });

        if (error) {
          console.error('Function error:', error);
          throw new Error('Erro ao conectar com o servidor. Tente novamente.');
        }

        if (data && data.error) {
           throw new Error(data.error);
        }

        alert('Usuário criado com sucesso!');
        fetchProfiles(); 
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  // Handlers para Cadastros Auxiliares
  const handleCreateGerencia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gerenciaForm.nome.trim()) return;
    
    try {
      const { data, error } = await supabase
        .from('gerencias')
        .insert({ nome: gerenciaForm.nome })
        .select()
        .single();
        
      if (error) throw error;
      setGerencias([...gerencias, data]);
      setIsGerenciaModalOpen(false);
      setGerenciaForm({ nome: '' });
      setFormData({...formData, gerencia_id: data.id});
    } catch (err: any) {
      alert('Erro ao criar gerência: ' + err.message);
    }
  };

  const handleCreateSetor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setorForm.nome.trim() || !setorForm.gerencia_id) return;

    try {
      const { data, error } = await supabase
        .from('setores')
        .insert({ nome: setorForm.nome, gerencia_id: setorForm.gerencia_id })
        .select()
        .single();

      if (error) throw error;
      setSetores([...setores, data]);
      setIsSetorModalOpen(false);
      setSetorForm({ nome: '', gerencia_id: '' });
      setFormData({...formData, setor_id: data.id});
    } catch (err: any) {
      alert('Erro ao criar setor: ' + err.message);
    }
  };

  const filteredProfiles = profiles.filter(p => 
    p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.username && p.username.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredSetores = setores.filter(s => 
    !formData.gerencia_id || s.gerencia_id === formData.gerencia_id
  );

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
          <p className="text-sm text-gray-500 mt-1">Gerencie permissões e estrutura organizacional</p>
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
                <th className="px-6 py-4 font-semibold text-gray-900">Cargo</th>
                <th className="px-6 py-4 font-semibold text-gray-900">Setor / Gerência</th>
                <th className="px-6 py-4 font-semibold text-gray-900 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProfiles.map((profile) => {
                const setor = setores.find(s => s.id === profile.setor_id);
                const gerencia = gerencias.find(g => g.id === profile.gerencia_id);
                
                return (
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
                      <div className="text-gray-900 font-medium">{setor?.nome || '-'}</div>
                      <div className="text-xs text-gray-500">{gerencia?.nome || '-'}</div>
                    </td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                      <button 
                        onClick={() => handleOpenEdit(profile)}
                        className="text-gray-500 hover:text-blue-600 p-1 rounded-md hover:bg-blue-50 transition-colors"
                        title="Detalhes / Editar"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteUser(profile.id)}
                        className="text-gray-500 hover:text-red-600 p-1 rounded-md hover:bg-red-50 transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Main User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center sticky top-0 z-10">
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

              {/* Campos Básicos */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.nome}
                  onChange={(e) => setFormData({...formData, nome: e.target.value})}
                  placeholder="Ex: João Silva"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Usuário (Login) <span className="text-red-500">*</span></label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">@</span>
                  <input
                    type="text"
                    className="w-full pl-7 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value.toLowerCase().replace(/\s/g, '')})}
                    placeholder="joaosilva"
                  />
                </div>
              </div>

              {!isEditMode && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">E-mail <span className="text-red-500">*</span></label>
                    <input
                      type="email"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      placeholder="joao@gov.br"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Senha <span className="text-red-500">*</span></label>
                    <input
                      type="password"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      placeholder="••••••••"
                    />
                  </div>
                </>
              )}

              {/* Hierarquia */}
              <div className="pt-2 border-t border-gray-100">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Estrutura Organizacional</h4>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cargo <span className="text-red-500">*</span></label>
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

                  {/* Campo Gerência */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-sm font-medium text-gray-700">Gerência</label>
                      {formData.role !== 'diretor' && (
                        <button 
                          type="button" 
                          onClick={() => setIsGerenciaModalOpen(true)}
                          className="text-xs text-blue-600 hover:underline flex items-center"
                        >
                          <Plus className="h-3 w-3 mr-1" /> Nova
                        </button>
                      )}
                    </div>
                    <select
                      className={`w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 
                        ${formData.role === 'diretor' ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
                      value={formData.gerencia_id}
                      onChange={(e) => setFormData({...formData, gerencia_id: e.target.value, setor_id: ''})}
                      disabled={formData.role === 'diretor'}
                    >
                      <option value="">-- Selecione --</option>
                      {gerencias.map(g => (
                        <option key={g.id} value={g.id}>{g.nome}</option>
                      ))}
                    </select>
                  </div>

                  {/* Campo Setor (Oculto para Gerentes) */}
                  {formData.role !== 'gerente' && (
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-sm font-medium text-gray-700">Setor</label>
                        {formData.role !== 'diretor' && (
                          <button 
                            type="button" 
                            onClick={() => {
                              setSetorForm({ nome: '', gerencia_id: formData.gerencia_id });
                              setIsSetorModalOpen(true);
                            }}
                            className="text-xs text-blue-600 hover:underline flex items-center"
                          >
                            <Plus className="h-3 w-3 mr-1" /> Novo
                          </button>
                        )}
                      </div>
                      <select
                        className={`w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 
                          ${formData.role === 'diretor' ? 'bg-gray-100 cursor-not-allowed text-gray-500' : 'bg-white'}`}
                        value={formData.setor_id}
                        onChange={(e) => setFormData({...formData, setor_id: e.target.value})}
                        disabled={!formData.gerencia_id || formData.role === 'diretor'}
                      >
                        <option value="">-- Selecione --</option>
                        {filteredSetores.map(s => (
                          <option key={s.id} value={s.id}>{s.nome}</option>
                        ))}
                      </select>
                      {!formData.gerencia_id && formData.role !== 'diretor' && (
                        <p className="text-xs text-gray-400 mt-1">Selecione uma gerência primeiro.</p>
                      )}
                    </div>
                  )}
                </div>
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
                  {formLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (isEditMode ? 'Salvar' : 'Criar Usuário')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nova Gerência */}
      {isGerenciaModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Nova Gerência</h3>
            <form onSubmit={handleCreateGerencia} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Gerência</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={gerenciaForm.nome}
                  onChange={(e) => setGerenciaForm({ nome: e.target.value })}
                  placeholder="Ex: Operações Especiais"
                  autoFocus
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setIsGerenciaModalOpen(false)}
                  className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-3 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Novo Setor */}
      {isSetorModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Novo Setor</h3>
            <form onSubmit={handleCreateSetor} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gerência Vinculada</label>
                <select
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50"
                  value={setorForm.gerencia_id}
                  onChange={(e) => setSetorForm({ ...setorForm, gerencia_id: e.target.value })}
                  disabled
                >
                  <option value="">Selecione...</option>
                  {gerencias.map(g => (
                    <option key={g.id} value={g.id}>{g.nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Setor</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={setorForm.nome}
                  onChange={(e) => setSetorForm({ ...setorForm, nome: e.target.value })}
                  placeholder="Ex: Equipe Noturna"
                  autoFocus
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setIsSetorModalOpen(false)}
                  className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-3 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg"
                >
                  Salvar
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
