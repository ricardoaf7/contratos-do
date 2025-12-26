import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Loader2, User } from 'lucide-react';

const Login = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [touched, setTouched] = useState({ identifier: false, password: false });
  
  const navigate = useNavigate();

  useEffect(() => {
    const savedUser = localStorage.getItem('saved_username');
    if (savedUser) {
      setIdentifier(savedUser);
      setRememberMe(true);
    }
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Tracking
    console.log(`[Auth] Tentativa de ${isSignUp ? 'cadastro' : 'login'} iniciada.`);

    try {
      if (isSignUp) {
        // Signup requires full email
        if (!identifier.includes('@')) {
          throw new Error('Para cadastro, por favor informe um e-mail válido.');
        }
        const { error } = await supabase.auth.signUp({
          email: identifier,
          password,
        });
        if (error) throw error;
        alert('Cadastro realizado! Verifique seu e-mail para confirmar.');
      } else {
        // Login logic - assume domain if not provided
        let emailToUse = identifier;
        if (!identifier.includes('@')) {
          emailToUse = `${identifier}@contratos.gov`;
          // Tracking normalization
          console.log(`[Auth] Normalizando usuário para: ${emailToUse}`);
        }

        const { data: authData, error } = await supabase.auth.signInWithPassword({
          email: emailToUse,
          password,
        });
        if (error) throw error;
        
        // --- AUTO-CORRECTION: Force profile creation if missing ---
        if (authData.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('user_id', authData.user.id)
            .single();

          if (!profile) {
            console.log('[Auth] Perfil não encontrado. Criando perfil de DIRETOR automaticamente...');
            await supabase.from('profiles').insert({
              user_id: authData.user.id,
              nome: emailToUse.split('@')[0],
              role: 'diretor'
            });
          } else {
             // Optional: Ensure it is director
             await supabase.from('profiles').update({ role: 'diretor' }).eq('user_id', authData.user.id);
          }
        }
        // -----------------------------------------------------------

        // Handle Remember Me
        if (rememberMe) {
          localStorage.setItem('saved_username', identifier);
        } else {
          localStorage.removeItem('saved_username');
        }
        
        navigate('/');
      }
    } catch (err: any) {
      console.error('[Auth] Erro:', err.message);
      // User friendly error message
      let friendlyError = err.message;
      if (err.message.includes('Invalid login credentials')) {
        friendlyError = 'Usuário ou senha incorretos. Verifique suas credenciais.';
      }
      setError(friendlyError);
    } finally {
      setLoading(false);
    }
  };

  const isIdentifierValid = identifier.length > 0;
  const isPasswordValid = password.length >= 6;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden transition-all duration-300">
        <div className="bg-blue-900 p-8 text-center">
          <div className="h-16 w-16 bg-blue-800 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
            <Lock className="h-8 w-8 text-blue-200" />
          </div>
          <h1 className="text-2xl font-bold text-white">GestãoGov</h1>
          <p className="text-blue-200 mt-2">Acesso ao Sistema de Contratos</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleAuth} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {isSignUp ? 'E-mail Profissional' : 'Usuário'}
              </label>
              <div className="relative group">
                {isSignUp ? (
                  <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 ${touched.identifier && !isIdentifierValid ? 'text-red-400' : 'text-gray-400 group-hover:text-blue-500'} transition-colors`} />
                ) : (
                  <User className={`absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 ${touched.identifier && !isIdentifierValid ? 'text-red-400' : 'text-gray-400 group-hover:text-blue-500'} transition-colors`} />
                )}
                <input
                  type={isSignUp ? "email" : "text"}
                  required
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all
                    ${touched.identifier && !isIdentifierValid 
                      ? 'border-red-300 focus:ring-red-200 bg-red-50' 
                      : 'border-gray-200 focus:ring-blue-500 focus:border-transparent'
                    }
                  `}
                  placeholder={isSignUp ? "seu@email.gov.br" : "Digite seu usuário"}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  onBlur={() => setTouched({...touched, identifier: true})}
                />
              </div>
              {touched.identifier && !isIdentifierValid && (
                <p className="text-xs text-red-500 mt-1">Campo obrigatório</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Senha
              </label>
              <div className="relative group">
                <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 ${touched.password && !isPasswordValid ? 'text-red-400' : 'text-gray-400 group-hover:text-blue-500'} transition-colors`} />
                <input
                  type="password"
                  required
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all
                    ${touched.password && !isPasswordValid 
                      ? 'border-red-300 focus:ring-red-200 bg-red-50' 
                      : 'border-gray-200 focus:ring-blue-500 focus:border-transparent'
                    }
                  `}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => setTouched({...touched, password: true})}
                />
              </div>
              {touched.password && !isPasswordValid && (
                <p className="text-xs text-red-500 mt-1">A senha deve ter no mínimo 6 caracteres</p>
              )}
            </div>

            {!isSignUp && (
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900 cursor-pointer select-none">
                  Lembrar meu usuário
                </label>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2 animate-pulse">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-all hover:shadow-lg active:scale-[0.98] flex items-center justify-center"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                isSignUp ? 'Criar Conta' : 'Entrar no Sistema'
              )}
            </button>

            <div className="text-center text-sm text-gray-500 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError('');
                  setTouched({ identifier: false, password: false });
                }}
                className="text-blue-600 hover:text-blue-800 hover:underline font-medium transition-colors"
              >
                {isSignUp ? 'Já tem conta? Fazer Login' : 'Não tem acesso? Criar conta'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Helper icon
function AlertCircle(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

export default Login;
