'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { usePagePermissions } from '@/hooks/usePagePermissions';
import {
  Package,
  UserCircle,
  Clock,
  ShoppingCart,
  Building2,
  Building,
  Users,
  Database,
  RefreshCw,
  FolderTree,
  ShoppingBag,
  TrendingUp,
  DollarSign,
  LayoutDashboard,
  User,
  Upload,
  Star,
  BarChart3,
  PieChart,
  Calendar,
  Target,
  Award,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  X,
  ClipboardList,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserMenu } from '@/components/UserMenu';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

const MOBILE_BREAKPOINT = 768;

const sectionItems: Record<
  string,
  {
    title: string;
    icon: React.ReactNode;
    items: { href: string; label: string; icon: React.ReactNode }[];
  }
> = {
  dashboard: {
    title: 'Dashboard',
    icon: <LayoutDashboard size={20} />,
    items: [
      { href: '/dashboard-financeiro', label: 'Financeiro', icon: <PieChart size={18} /> },
      { href: '/dashboard/realizado', label: 'Realizado', icon: <BarChart3 size={18} /> },
      { href: '/dashboard/realizado-mes', label: 'Realizado por Mês', icon: <Calendar size={18} /> },
      { href: '/dashboard/previsao', label: 'Previsão', icon: <TrendingUp size={18} /> },
      { href: '/dashboard/empresas', label: 'Empresas', icon: <Building2 size={18} /> },
      { href: '/dashboard/empresa', label: 'Empresa', icon: <Building size={18} /> },
      { href: '/dashboard/equipe', label: 'Equipe', icon: <Users size={18} /> },
      { href: '/dashboard/funcionario', label: 'Funcionário', icon: <User size={18} /> },
      { href: '/dashboard/nps_interno', label: 'NPS (Interno)', icon: <Star size={18} /> },
      { href: '/dashboard/nps', label: 'Dashboard NPS', icon: <BarChart3 size={18} /> },
    ],
  },
  metas: {
    title: 'Metas',
    icon: <Target size={20} />,
    items: [
      { href: '/metas/financeiro', label: 'Meta Financeiro', icon: <PieChart size={18} /> },
      { href: '/metas', label: 'Meta Faturamento', icon: <DollarSign size={18} /> },
      { href: '/metas/pesquisas', label: 'Meta Pesquisas', icon: <Target size={18} /> },
      { href: '/metas/produtos', label: 'Meta Produtos', icon: <Package size={18} /> },
      { href: '/metas/qualidade/categorias', label: 'Categorias Qualidade', icon: <Award size={18} /> },
      { href: '/metas/qualidade', label: 'Metas de Qualidade', icon: <Target size={18} /> },
      { href: '/metas/qualidade/realizado', label: 'Resultados Qualidade', icon: <CheckCircle2 size={18} /> },
    ],
  },
  compras: {
    title: 'Compras',
    icon: <ShoppingBag size={20} />,
    items: [
      { href: '/compras/materias-primas', label: 'Matérias-Primas', icon: <ShoppingBag size={18} /> },
      { href: '/compras/projecao-revenda', label: 'Projeção Revenda', icon: <TrendingUp size={18} /> },
      { href: '/compras/projecao-mp', label: 'Projeção MP', icon: <Package size={18} /> },
      { href: '/compras/listas-compra', label: 'Listas de Compra', icon: <ClipboardList size={18} /> },
    ],
  },
  cadastros: {
    title: 'Cadastros',
    icon: <Package size={20} />,
    items: [
      { href: '/cadastros/produtos', label: 'Produtos', icon: <Package size={18} /> },
      { href: '/cadastros/funcionarios', label: 'Funcionários', icon: <UserCircle size={18} /> },
      { href: '/cadastros/turnos', label: 'Turnos', icon: <Clock size={18} /> },
      { href: '/cadastros/modo-venda', label: 'Modo de Venda', icon: <ShoppingCart size={18} /> },
      { href: '/cadastros/categorias', label: 'Categorias', icon: <FolderTree size={18} /> },
    ],
  },
  nps: {
    title: 'NPS',
    icon: <Star size={20} />,
    items: [
      { href: '/nps', label: 'Dashboard', icon: <BarChart3 size={18} /> },
      { href: '/nps/pesquisas', label: 'Pesquisas', icon: <BarChart3 size={18} /> },
      { href: '/nps/perguntas', label: 'Perguntas', icon: <Target size={18} /> },
      { href: '/nps/links', label: 'QR Codes & Links', icon: <Star size={18} /> },
      { href: '/nps/respostas', label: 'Respostas', icon: <CheckCircle2 size={18} /> },
    ],
  },
  powerbi: {
    title: 'Importar',
    icon: <Upload size={20} />,
    items: [
      { href: '/powerbi/conexoes', label: 'Conexões', icon: <Database size={18} /> },
      { href: '/powerbi/sincronizacao', label: 'Sincronização', icon: <RefreshCw size={18} /> },
      { href: '/powerbi/sincronizacao', label: 'Importar', icon: <Upload size={18} /> },
    ],
  },
  config: {
    title: 'Configuração',
    icon: <Building2 size={20} />,
    items: [
      { href: '/grupos', label: 'Grupos', icon: <Building2 size={18} /> },
      { href: '/empresas', label: 'Empresas', icon: <Building size={18} /> },
      { href: '/usuarios', label: 'Usuários', icon: <Users size={18} /> },
      { href: '/conciliacao/produtos', label: 'Conciliação Produtos', icon: <Package size={18} /> },
      { href: '/conciliacao/categorias', label: 'Conciliação Categorias', icon: <FolderTree size={18} /> },
      { href: '/conciliacao/empresas', label: 'Conciliação Empresas', icon: <Building size={18} /> },
      { href: '/conciliacao/funcionarios', label: 'Conciliação Funcionários', icon: <UserCircle size={18} /> },
    ],
  },
};

export function MobileNav({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const { canViewRoute, loading: permLoading } = usePagePermissions();
  const [isMobile, setIsMobile] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const drawerRef = useRef<HTMLDivElement>(null);

  // Responsive check
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Expand active group on open
  useEffect(() => {
    if (!open || permLoading) return;
    const activeKey = Object.entries(sectionItems).find(([, s]) =>
      s.items.some((i) => pathname === i.href || pathname.startsWith(i.href + '/'))
    )?.[0];
    if (activeKey) {
      setExpandedGroups((prev) => new Set(prev).add(activeKey));
    }
  }, [open, pathname, permLoading]);

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleNavigate = (href: string) => {
    router.push(href);
    onOpenChange(false);
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  const filterByPermission = (
    items: { href: string; label: string; icon: React.ReactNode }[]
  ) => {
    if (!user) return [];
    if (user.role === 'master') return items;
    return items.filter((item) => canViewRoute(item.href));
  };

  if (!isMobile) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        ref={drawerRef}
        className={cn(
          'mobile-drawer fixed left-0 top-0 bottom-0 w-[85vw] max-w-[340px] m-0 translate-x-0 translate-y-0 rounded-none border-r shadow-2xl p-0 gap-0 max-w-none z-[200]',
          'flex flex-col transition-transform duration-300 ease-out data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=closed]:-translate-x-full data-[state=open]:translate-x-0',
          'bg-white'
        )}
        aria-describedby={undefined}
      >
        <VisuallyHidden>
          <DialogTitle>Menu de navegação</DialogTitle>
          <DialogDescription>
            Navegação principal do aplicativo. Use as setas para expandir as seções.
          </DialogDescription>
        </VisuallyHidden>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600">
              <svg
                className="w-5 h-5 text-white"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  fill="none"
                />
                <path
                  d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  fill="none"
                />
              </svg>
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-lg leading-tight">Vion Up!</h2>
              <p className="text-xs text-gray-400 leading-tight">Navegação</p>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="p-2 -mr-1 rounded-lg hover:bg-gray-100 active:bg-gray-200 text-gray-500 transition-colors touch-manipulation"
            aria-label="Fechar menu"
          >
            <X size={22} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          {permLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <div className="w-7 h-7 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin mb-3" />
              <p className="text-sm">Carregando...</p>
            </div>
          ) : (
            <div className="py-2">
              {Object.entries(sectionItems).map(([key, section]) => {
                let items = filterByPermission(section.items);
                if (items.length === 0) return null;
                if (key === 'powerbi' && user?.role !== 'master') return null;
                if (key === 'config' && user?.role !== 'master') {
                  items = items.filter((i) => i.href !== '/grupos');
                  if (items.length === 0) return null;
                }

                const isExpanded = expandedGroups.has(key);
                const hasActive = items.some((i) => isActive(i.href));

                return (
                  <div key={key}>
                    {/* Section header */}
                    <button
                      type="button"
                      onClick={() => toggleGroup(key)}
                      className={cn(
                        'w-full flex items-center gap-3 px-5 py-3 text-left transition-colors touch-manipulation',
                        'hover:bg-gray-50 active:bg-gray-100',
                        hasActive && !isExpanded && 'bg-blue-50/50'
                      )}
                    >
                      <span
                        className={cn(
                          'w-9 h-9 flex items-center justify-center rounded-lg flex-shrink-0 transition-colors',
                          hasActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
                        )}
                      >
                        {section.icon}
                      </span>
                      <span
                        className={cn(
                          'flex-1 text-[15px] font-semibold transition-colors',
                          hasActive ? 'text-blue-700' : 'text-gray-700'
                        )}
                      >
                        {section.title}
                      </span>
                      <ChevronDown
                        size={18}
                        className={cn(
                          'text-gray-400 transition-transform duration-200 flex-shrink-0',
                          isExpanded && 'rotate-180'
                        )}
                      />
                    </button>

                    {/* Expanded items */}
                    <div
                      className={cn(
                        'overflow-hidden transition-all duration-200 ease-out',
                        isExpanded ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
                      )}
                    >
                      <div className="pb-2 pt-0.5">
                        {items.map((item) => {
                          const active = isActive(item.href);
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={(e) => {
                                e.preventDefault();
                                handleNavigate(item.href);
                              }}
                              className={cn(
                                'flex items-center gap-3 mx-3 px-3 py-2.5 rounded-lg transition-all touch-manipulation',
                                active
                                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                                  : 'text-gray-600 hover:bg-gray-50 active:bg-gray-100'
                              )}
                            >
                              <span className={cn('flex-shrink-0 ml-1', active ? 'text-white/90' : 'text-gray-400')}>
                                {item.icon}
                              </span>
                              <span className={cn('flex-1 text-sm font-medium', active && 'text-white')}>
                                {item.label}
                              </span>
                              {active && (
                                <span className="w-1.5 h-1.5 rounded-full bg-white flex-shrink-0" />
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </nav>

        {/* Footer */}
        <div className="shrink-0 border-t border-gray-100 px-5 py-3 bg-gray-50/80">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-800 truncate">{user?.name || 'Usuário'}</p>
              <p className="text-xs text-gray-400 truncate">{user?.email || ''}</p>
            </div>
            <UserMenu />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}