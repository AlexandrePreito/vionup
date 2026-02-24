'use client';

import { useState, useEffect } from 'react';
import { Package, UserCircle, Clock, ShoppingCart, Building2, Building, Users, Database, RefreshCw, Settings, ShoppingBag, Target, LayoutDashboard, Upload, Star, ClipboardList } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useSidebar } from '@/contexts/sidebar-context';
import { useAuth } from '@/contexts/AuthContext';
import { usePagePermissions } from '@/hooks/usePagePermissions';
import { UserMenu } from '@/components/UserMenu';
import { MobileNav } from '@/components/layout/MobileNav';

const MOBILE_BREAKPOINT = 768;

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { setActiveSection, activeSection, isExpanded, isMobileMenuOpen, setIsMobileMenuOpen } = useSidebar();
  const { user } = useAuth();
  const { canViewRoute } = usePagePermissions();
  const [isMobile, setIsMobile] = useState(false);

  const hasDashboardAccess = canViewRoute('/dashboard/realizado') || canViewRoute('/dashboard-financeiro');
  const hasMetasAccess = canViewRoute('/metas');
  const hasComprasAccess = canViewRoute('/compras/materias-primas');
  const hasCadastrosAccess = canViewRoute('/cadastros/produtos');
  const hasNPSAccess = canViewRoute('/nps');
  const hasConfigAccess = canViewRoute('/empresas') || canViewRoute('/usuarios') || canViewRoute('/grupos');

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

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
    { label: 'Matérias-Primas', href: '/compras/materias-primas', icon: ShoppingBag },
    { label: 'Listas de Compra', href: '/compras/listas-compra', icon: ClipboardList }
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
  const isDashboardActive = (pathname.startsWith('/dashboard/') && !pathname.startsWith('/dashboard/importar')) || pathname === '/dashboard-financeiro';
  const isNPSActive = npsItems.some(item => isActive(item.href)) || pathname.startsWith('/nps/');

  return (
    <>
      {/* Mobile: apenas bolinha flutuante (sem header) | Desktop: header completo */}
      {isMobile ? (
        /* Mobile: header mínimo com botão menu (sem ícone flutuante azul) */
        <header className="fixed top-0 left-0 right-0 h-14 z-30 bg-white/95 backdrop-blur border-b border-gray-200 flex items-center px-4">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2.5 -ml-1 rounded-lg text-gray-600 hover:bg-gray-100 active:bg-gray-200 transition-colors touch-manipulation"
            aria-label="Abrir menu"
          >
            <span className="flex flex-col gap-1.5">
              <span className="w-5 h-0.5 rounded-full bg-gray-600" />
              <span className="w-5 h-0.5 rounded-full bg-gray-600" />
              <span className="w-5 h-0.5 rounded-full bg-gray-600" />
            </span>
          </button>
          <div className="flex-1" />
          <UserMenu />
        </header>
      ) : (
      <header className={`h-16 bg-white border-b border-gray-200 fixed top-0 z-30 shadow-sm transition-all duration-300 
        ${isExpanded ? 'right-0 left-64' : 'right-0 left-16'}
      `}>
        <div className="flex items-center justify-between h-full px-6">
          <div className="flex-1" />
          {/* Menu de Navegação - Centralizado (desktop) */}
          <nav className="flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
          {/* Dashboard */}
          <button
            onClick={() => { if (hasDashboardAccess) { setActiveSection('dashboard'); router.push('/dashboard/realizado'); } }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              !hasDashboardAccess
                ? 'text-gray-400 bg-gray-50 cursor-not-allowed opacity-70'
                : activeSection === 'dashboard' || isDashboardActive
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-700 hover:bg-gray-100'
            }`}
            title={!hasDashboardAccess ? 'Sem acesso' : undefined}
          >
            <span className="text-sm font-medium">Dashboard</span>
          </button>

          {/* Metas */}
          <button
            onClick={() => { if (hasMetasAccess) { setActiveSection('metas'); router.push('/metas'); } }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              !hasMetasAccess
                ? 'text-gray-400 bg-gray-50 cursor-not-allowed opacity-70'
                : activeSection === 'metas' || isMetasActive
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-700 hover:bg-gray-100'
            }`}
            title={!hasMetasAccess ? 'Sem acesso' : undefined}
          >
            <span className="text-sm font-medium">Metas</span>
          </button>

          {/* Compras */}
          <button
            onClick={() => { if (hasComprasAccess) { setActiveSection('compras'); router.push('/compras/materias-primas'); } }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              !hasComprasAccess
                ? 'text-gray-400 bg-gray-50 cursor-not-allowed opacity-70'
                : activeSection === 'compras' || isComprasActive
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-700 hover:bg-gray-100'
            }`}
            title={!hasComprasAccess ? 'Sem acesso' : undefined}
          >
            <span className="text-sm font-medium">Compras</span>
          </button>

          {/* Cadastros */}
          <button
            onClick={() => { if (hasCadastrosAccess) { setActiveSection('cadastros'); router.push('/cadastros/produtos'); } }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              !hasCadastrosAccess
                ? 'text-gray-400 bg-gray-50 cursor-not-allowed opacity-70'
                : activeSection === 'cadastros' || isCadastrosActive
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-700 hover:bg-gray-100'
            }`}
            title={!hasCadastrosAccess ? 'Sem acesso' : undefined}
          >
            <span className="text-sm font-medium">Cadastros</span>
          </button>

          {/* NPS */}
          <button
            onClick={() => { if (hasNPSAccess) { setActiveSection('nps'); router.push('/nps'); } }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              !hasNPSAccess
                ? 'text-gray-400 bg-gray-50 cursor-not-allowed opacity-70'
                : activeSection === 'nps' || isNPSActive
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-700 hover:bg-gray-100'
            }`}
            title={!hasNPSAccess ? 'Sem acesso' : undefined}
          >
            <span className="text-sm font-medium">NPS</span>
          </button>

          {/* Importar - Apenas para master (vai para Sincronização Power BI) */}
          {user?.role === 'master' && (
            <button
              onClick={() => {
                setActiveSection('powerbi');
                router.push('/powerbi/sincronizacao');
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
              if (!hasConfigAccess) return;
              setActiveSection('config');
              if (user?.role === 'master') {
                router.push('/grupos');
              } else {
                router.push('/empresas');
              }
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              !hasConfigAccess
                ? 'text-gray-400 bg-gray-50 cursor-not-allowed opacity-70'
                : activeSection === 'config' || isConfigActive
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-700 hover:bg-gray-100'
            }`}
            title={!hasConfigAccess ? 'Sem acesso' : undefined}
          >
            <span className="text-sm font-medium">Configuração</span>
          </button>
        </nav>

          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <UserMenu />
          </div>
        </div>
      </header>
      )}
      <MobileNav open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen} />
    </>
  );
}
