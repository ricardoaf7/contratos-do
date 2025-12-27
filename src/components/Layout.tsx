import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, DollarSign, PieChart, Menu, Users, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userRole, setUserRole] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    getUserProfile();
  }, []);

  const getUserProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserName(user.email?.split('@')[0] || 'Usuário');
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      setUserRole(data?.role || '');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Contratos', href: '/contratos', icon: FileText },
    { name: 'Execução Financeira', href: '/financeiro', icon: DollarSign },
    { name: 'Relatórios', href: '/relatorios', icon: PieChart },
  ];

  if (userRole === 'diretor') {
    navigation.push({ name: 'Equipe', href: '/usuarios', icon: Users });
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`
          fixed lg:static inset-y-0 left-0 z-30
          w-64 bg-blue-900 text-white transform transition-transform duration-200 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="h-16 flex items-center px-6 border-b border-blue-800 gap-3">
          <img src="/logo.png" alt="Gestão de Contratos" className="h-8 w-8 object-contain" />
          <span className="text-xl font-bold">Gestão de Contratos</span>
        </div>

        <nav className="mt-6 px-4 space-y-2">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`
                  flex items-center px-4 py-3 rounded-lg transition-colors
                  ${isActive 
                    ? 'bg-blue-800 text-white shadow-sm' 
                    : 'text-blue-100 hover:bg-blue-800/50'
                  }
                `}
              >
                <item.icon className="h-5 w-5 mr-3" />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-blue-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center min-w-0">
              <div className="h-8 w-8 rounded-full bg-blue-700 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold uppercase">{userName.charAt(0)}</span>
              </div>
              <div className="ml-3 truncate">
                <p className="text-sm font-medium truncate">{userName}</p>
                <p className="text-xs text-blue-300 capitalize">{userRole}</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 text-blue-300 hover:text-white rounded-lg hover:bg-blue-800 transition-colors"
              title="Sair"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="bg-white shadow-sm lg:hidden">
          <div className="h-16 flex items-center px-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="text-gray-500 hover:text-gray-700"
            >
              <Menu className="h-6 w-6" />
            </button>
            <span className="ml-4 text-lg font-semibold text-gray-900">Gestão de Contratos</span>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
