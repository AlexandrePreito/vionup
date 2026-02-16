'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSidebar } from '@/contexts/sidebar-context';
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
  ChevronRight,
  ChevronLeft,
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
  Calendar,
  FileText,
  MessageSquare,
  QrCode,
  Settings,
  ClipboardList,
  Search,
  Award,
  Target,
  CheckCircle2
} from 'lucide-react';

interface SidebarItem {
  href: string;
  icon: React.ReactNode;
  tooltip: string;
}

interface SidebarGroup {
  title: string;
  items: SidebarItem[];
}

const cadastrosItems: SidebarItem[] = [
  {
    href: '/cadastros/produtos',
    icon: <Package size={20} />,
    tooltip: 'Produtos'
  },
  {
    href: '/cadastros/funcionarios',
    icon: <UserCircle size={20} />,
    tooltip: 'Funcionários'
  },
  {
    href: '/cadastros/turnos',
    icon: <Clock size={20} />,
    tooltip: 'Turnos'
  },
  {
    href: '/cadastros/modo-venda',
    icon: <ShoppingCart size={20} />,
    tooltip: 'Modo de Venda'
  },
  {
    href: '/cadastros/categorias',
    icon: <FolderTree size={20} />,
    tooltip: 'Categorias'
  }
];

const configItems: SidebarItem[] = [
  {
    href: '/grupos',
    icon: <Building2 size={20} />,
    tooltip: 'Grupos'
  },
  {
    href: '/empresas',
    icon: <Building size={20} />,
    tooltip: 'Empresas'
  },
  {
    href: '/usuarios',
    icon: <Users size={20} />,
    tooltip: 'Usuários'
  }
];

const powerbiItems: SidebarItem[] = [
  {
    href: '/powerbi/conexoes',
    icon: <Database size={20} />,
    tooltip: 'Conexões'
  },
  {
    href: '/powerbi/sincronizacao',
    icon: <RefreshCw size={20} />,
    tooltip: 'Sincronização'
  },
  {
    href: '/dashboard/importar',
    icon: <Upload size={20} />,
    tooltip: 'Importar'
  }
];

const comprasItems: SidebarItem[] = [
  {
    href: '/compras/materias-primas',
    icon: <ShoppingBag size={20} />,
    tooltip: 'Matérias-Primas'
  },
  {
    href: '/compras/projecao-revenda',
    icon: <TrendingUp size={20} />,
    tooltip: 'Projeção Revenda'
  },
  {
    href: '/compras/projecao-mp',
    icon: <Package size={20} />,
    tooltip: 'Projeção MP'
  }
];

const metasItems: (SidebarItem | SidebarGroup)[] = [
  {
    href: '/metas',
    icon: <DollarSign size={20} />,
    tooltip: 'Meta Faturamento'
  },
  {
    href: '/metas/pesquisas',
    icon: <Search size={20} />,
    tooltip: 'Meta Pesquisas'
  },
  {
    href: '/metas/produtos',
    icon: <Package size={20} />,
    tooltip: 'Meta Produtos'
  },
  {
    title: 'Qualidade',
    items: [
      {
        href: '/metas/qualidade/categorias',
        icon: <Award size={20} />,
        tooltip: 'Categorias de Qualidade'
      },
      {
        href: '/metas/qualidade',
        icon: <Target size={20} />,
        tooltip: 'Metas de Qualidade'
      },
      {
        href: '/metas/qualidade/realizado',
        icon: <CheckCircle2 size={20} />,
        tooltip: 'Resultados de Qualidade'
      }
    ]
  }
];

const dashboardItems: (SidebarItem | SidebarGroup)[] = [
  {
    title: 'Realizado',
    items: [
      {
        href: '/dashboard/realizado',
        icon: <BarChart3 size={20} />,
        tooltip: 'Realizado'
      },
      {
        href: '/dashboard/realizado-mes',
        icon: <Calendar size={20} />,
        tooltip: 'Realizado por Mês'
      },
      {
        href: '/dashboard/previsao',
        icon: <TrendingUp size={20} />,
        tooltip: 'Previsão de Vendas'
      }
    ]
  },
  {
    title: 'Metas Empresa',
    items: [
      {
        href: '/dashboard/empresas',
        icon: <Building2 size={20} />,
        tooltip: 'Empresas'
      },
      {
        href: '/dashboard/empresa',
        icon: <Building size={20} />,
        tooltip: 'Empresa'
      }
    ]
  },
  {
    title: 'Meta Funcionário',
    items: [
      {
        href: '/dashboard/equipe',
        icon: <Users size={20} />,
        tooltip: 'Equipe'
      },
      {
        href: '/dashboard/funcionario',
        icon: <User size={20} />,
        tooltip: 'Funcionário'
      }
    ]
  },
  {
    title: 'NPS',
    items: [
      {
        href: '/dashboard/nps_interno',
        icon: <Star size={20} />,
        tooltip: 'NPS (Interno)'
      },
      {
        href: '/dashboard/nps',
        icon: <BarChart3 size={20} />,
        tooltip: 'Dashboard NPS (Goomer)'
      }
    ]
  }
];

const npsItems: SidebarItem[] = [
  {
    href: '/nps',
    icon: <BarChart3 size={20} />,
    tooltip: 'Dashboard'
  },
  {
    href: '/nps/pesquisas',
    icon: <FileText size={20} />,
    tooltip: 'Pesquisas'
  },
  {
    href: '/nps/perguntas',
    icon: <MessageSquare size={20} />,
    tooltip: 'Perguntas'
  },
  {
    href: '/nps/links',
    icon: <QrCode size={20} />,
    tooltip: 'QR Codes & Links'
  },
  {
    href: '/nps/respostas',
    icon: <ClipboardList size={20} />,
    tooltip: 'Respostas'
  },
  {
    href: '/nps/configuracoes',
    icon: <Settings size={20} />,
    tooltip: 'Configurações'
  }
];

export function Sidebar() {
  const pathname = usePathname();
  const { activeSection, isExpanded, setIsExpanded } = useSidebar();
  const { user } = useAuth();
  const { canViewRoute, loading: permLoading } = usePagePermissions();

  const isActive = (href: string, allItemsInGroup?: SidebarItem[]) => {
    if (href === '/') return pathname === '/';
    
    // Se há outros itens no grupo, verificar se algum deles também corresponde
    if (allItemsInGroup && allItemsInGroup.length > 1) {
      // Verificar se há outros itens que começam com o mesmo prefixo
      const conflictingItems = allItemsInGroup.filter(item => 
        item.href !== href && 
        (item.href.startsWith(href + '/') || href.startsWith(item.href + '/'))
      );
      
      // Se há conflitos, usar correspondência exata
      if (conflictingItems.length > 0) {
        return pathname === href;
      }
    }
    
    // Correspondência exata ou se a rota começa com o href (para sub-rotas)
    return pathname === href || pathname.startsWith(href + '/');
  };

  // Função helper para filtrar itens por permissão
  const filterByPermission = (items: (SidebarItem | SidebarGroup)[]): (SidebarItem | SidebarGroup)[] => {
    if (!user) return [];
    if (user.role === 'master') return items;
    
    return items.map(item => {
      if ('title' in item && 'items' in item) {
        const group = item as SidebarGroup;
        const filteredItems = group.items.filter(gi => canViewRoute(gi.href));
        if (filteredItems.length === 0) return null;
        return { ...group, items: filteredItems };
      }
      const normalItem = item as SidebarItem;
      return canViewRoute(normalItem.href) ? normalItem : null;
    }).filter(Boolean) as (SidebarItem | SidebarGroup)[];
  };

  // Determinar quais itens mostrar
  let sidebarItems: (SidebarItem | SidebarGroup)[] = [];
  
  if (activeSection === 'cadastros') {
    sidebarItems = cadastrosItems;
  } else if (activeSection === 'config') {
    // Filtrar itens de configuração: apenas master pode ver "Grupos"
    sidebarItems = configItems.filter(item => {
      if (item.href === '/grupos') {
        return user?.role === 'master';
      }
      return true;
    });
  } else if (activeSection === 'powerbi') {
    // Filtrar itens do Power BI: apenas master pode ver "Importar"
    sidebarItems = powerbiItems.filter(item => {
      if (item.href === '/dashboard/importar') {
        return user?.role === 'master';
      }
      return true;
    });
  } else if (activeSection === 'compras') {
    sidebarItems = comprasItems;
  } else if (activeSection === 'metas') {
    sidebarItems = metasItems;
  } else if (activeSection === 'dashboard') {
    sidebarItems = dashboardItems;
  } else if (activeSection === 'nps') {
    sidebarItems = npsItems;
  }

  // Aplicar filtro de permissões
  if (!permLoading) {
    sidebarItems = filterByPermission(sidebarItems);
  }

  return (
    <aside className={`hidden md:flex bg-white border-r border-gray-200 min-h-screen flex-col fixed left-0 top-0 z-40 transition-all duration-300 ${isExpanded ? 'w-64' : 'w-16'}`}>
      {/* Header */}
      <div className={`flex items-center ${isExpanded ? 'justify-between gap-3 px-4' : 'justify-center'} p-4 border-b border-gray-200 h-16 transition-all duration-300`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
            {/* Rocket Icon com gradiente e rotação baseada no estado */}
            <svg 
              className={`w-8 h-8 transition-transform duration-300 ${isExpanded ? 'rotate-45' : '-rotate-45'}`}
              viewBox="0 0 24 24" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="rocketGradientSidebar" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
              </defs>
              <path 
                d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" 
                stroke="url(#rocketGradientSidebar)" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                fill="none"
              />
              <path 
                d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" 
                stroke="url(#rocketGradientSidebar)" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                fill="none"
              />
              <path 
                d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" 
                stroke="url(#rocketGradientSidebar)" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                fill="none"
              />
              <path 
                d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" 
                stroke="url(#rocketGradientSidebar)" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                fill="none"
              />
            </svg>
          </div>
          {isExpanded && (
            <div className="flex flex-col">
              <h1 className="text-sm font-bold text-gray-900 leading-tight">Vion Up!</h1>
              <p className="text-xs text-gray-400 leading-tight">Inteligência em metas</p>
            </div>
          )}
        </div>
        {/* Botão de expandir/colapsar */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`flex items-center justify-center w-8 h-8 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors ${!isExpanded ? 'mx-auto' : ''}`}
          title={isExpanded ? 'Colapsar menu' : 'Expandir menu'}
        >
          {isExpanded ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>
      </div>

      {/* Menu */}
      <nav className="flex-1 p-2 overflow-y-auto">
        {sidebarItems.length > 0 ? (
          <div className="space-y-4">
            {sidebarItems.map((item) => {
              // Verificar se é um grupo
              if ('title' in item && 'items' in item) {
                const group = item as SidebarGroup;
                return (
                  <div key={group.title} className="space-y-2">
                    {/* Título do grupo */}
                    {isExpanded && (
                      <div className="px-3 py-2">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          {group.title}
                        </h3>
                      </div>
                    )}
                    {/* Itens do grupo */}
                    <ul className="space-y-1">
                      {group.items.map((groupItem) => {
                        const active = isActive(groupItem.href, group.items);
                        return (
                          <li key={groupItem.href}>
                            <Link href={groupItem.href}>
                              <div
                                className={`w-full flex items-center ${isExpanded ? 'gap-3 px-3' : 'justify-center'} p-2.5 rounded-lg transition-colors ${
                                  active
                                    ? 'bg-blue-50 text-blue-600'
                                    : 'text-gray-600 hover:bg-gray-100'
                                }`}
                                title={groupItem.tooltip}
                              >
                                {groupItem.icon}
                                {isExpanded && (
                                  <span className="text-sm font-medium">{groupItem.tooltip}</span>
                                )}
                              </div>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              }
              
              // Item normal
              const normalItem = item as SidebarItem;
              const active = isActive(normalItem.href);
              return (
                <div key={normalItem.href}>
                  <Link href={normalItem.href}>
                    <div
                      className={`w-full flex items-center ${isExpanded ? 'gap-3 px-3' : 'justify-center'} p-3 rounded-lg transition-colors ${
                        active
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                      title={normalItem.tooltip}
                    >
                      {normalItem.icon}
                      {isExpanded && (
                        <span className="text-sm font-medium">{normalItem.tooltip}</span>
                      )}
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className={`text-xs text-gray-400 text-center ${isExpanded ? 'px-4' : 'px-2'}`}>
              {isExpanded ? 'Selecione uma seção no menu superior' : 'Selecione'}
            </p>
          </div>
        )}
      </nav>
    </aside>
  );
}
