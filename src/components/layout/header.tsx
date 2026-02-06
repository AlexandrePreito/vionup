'use client';

import { Package, UserCircle, Clock, ShoppingCart, Building2, Building, Users, Database, RefreshCw, Settings, ShoppingBag, Target, LayoutDashboard, Upload, Star } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useSidebar } from '@/contexts/sidebar-context';
import { useAuth } from '@/contexts/AuthContext';
import { UserMenu } from '@/components/UserMenu';

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { setActiveSection, activeSection, isExpanded } = useSidebar();
  const { user } = useAuth();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const cadastrosItems = [
    { label: 'Produtos', href: '/cadastros/produtos', icon: Package },
    { label: 'Funcionários', href: '/cadastros/funcionarios', icon: UserCircle },
    { label: 'Turnos', href: '/cadastros/turnos', icon: Clock },
    { label: 'Modo de Venda', href: '/cadastros/modo-venda', icon: ShoppingCart }
  ];

  const configItems = [
    { label: 'Grupos', href: '/grupos', icon: Building2 },
    { label: 'Empresas', href: '/empresas', icon: Building },
    { label: 'Usuários', href: '/usuarios', icon: Users }
  ];

  const powerbiItems = [
    { label: 'Conexões', href: '/powerbi/conexoes', icon: Database },
    { label: 'Sincronização', href: '/powerbi/sincronizacao', icon: RefreshCw }
  ];

  const comprasItems = [
    { label: 'Matérias-Primas', href: '/compras/materias-primas', icon: ShoppingBag }
  ];

  const metasItems = [
    { label: 'Metas', href: '/metas', icon: Target }
  ];

  const dashboardItems = [
    { label: 'Funcionário', href: '/dashboard/funcionario', icon: LayoutDashboard }
  ];

  const npsItems = [
    { label: 'Dashboard', href: '/nps', icon: Star }
  ];

  const isCadastrosActive = cadastrosItems.some(item => isActive(item.href));
  const isConfigActive = configItems.some(item => isActive(item.href));
  const isPowerBIActive = powerbiItems.some(item => isActive(item.href)) || pathname.startsWith('/dashboard/importar');
  const isComprasActive = comprasItems.some(item => isActive(item.href));
  const isMetasActive = metasItems.some(item => isActive(item.href));
  const isDashboardActive = pathname.startsWith('/dashboard/') && !pathname.startsWith('/dashboard/importar');
  const isNPSActive = npsItems.some(item => isActive(item.href)) || pathname.startsWith('/nps/');

  return (
    <header className={`h-16 bg-white border-b border-gray-200 fixed top-0 right-0 z-30 shadow-sm transition-all duration-300 ${isExpanded ? 'left-64' : 'left-16'}`}>
      <div className="flex items-center justify-between h-full px-6">
        {/* Espaçador esquerdo */}
        <div className="flex-1"></div>

        {/* Menu de Navegação - Centralizado */}
        <nav className="flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
          {/* Dashboard */}
          <button
            onClick={() => {
              setActiveSection('dashboard');
              router.push('/dashboard/realizado');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              activeSection === 'dashboard' || isDashboardActive
                ? 'bg-blue-50 text-blue-600'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <span className="text-sm font-medium">Dashboard</span>
          </button>

          {/* Metas */}
          <button
            onClick={() => {
              setActiveSection('metas');
              router.push('/metas');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              activeSection === 'metas' || isMetasActive
                ? 'bg-blue-50 text-blue-600'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <span className="text-sm font-medium">Metas</span>
          </button>

          {/* Compras */}
          <button
            onClick={() => {
              setActiveSection('compras');
              router.push('/compras/materias-primas');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              activeSection === 'compras' || isComprasActive
                ? 'bg-blue-50 text-blue-600'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <span className="text-sm font-medium">Compras</span>
          </button>

          {/* Cadastros */}
          <button
            onClick={() => {
              setActiveSection('cadastros');
              router.push('/cadastros/produtos');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              activeSection === 'cadastros' || isCadastrosActive
                ? 'bg-blue-50 text-blue-600'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <span className="text-sm font-medium">Cadastros</span>
          </button>

          {/* NPS */}
          <button
            onClick={() => {
              setActiveSection('nps');
              router.push('/nps');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              activeSection === 'nps' || isNPSActive
                ? 'bg-blue-50 text-blue-600'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <span className="text-sm font-medium">NPS</span>
          </button>

          {/* Importar - Apenas para master */}
          {user?.role === 'master' && (
            <button
              onClick={() => {
                setActiveSection('powerbi');
                router.push('/dashboard/importar');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeSection === 'powerbi' || isPowerBIActive
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="text-sm font-medium">Importar</span>
            </button>
          )}

          {/* Configuração */}
          <button
            onClick={() => {
              setActiveSection('config');
              // Master vai para grupos, outros vão para empresas
              if (user?.role === 'master') {
                router.push('/grupos');
              } else {
                router.push('/empresas');
              }
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              activeSection === 'config' || isConfigActive
                ? 'bg-blue-50 text-blue-600'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <span className="text-sm font-medium">Configuração</span>
          </button>
        </nav>

        {/* Espaçador direito */}
        <div className="flex-1"></div>

        {/* Ações do usuário */}
        <div className="flex items-center gap-3">
          {/* Menu do usuário */}
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
