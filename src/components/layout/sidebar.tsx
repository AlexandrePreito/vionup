'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSidebar } from '@/contexts/sidebar-context';
import { useAuth } from '@/contexts/AuthContext';
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
  Calendar
} from 'lucide-react';

interface SidebarItem {
  href: string;
  icon: React.ReactNode;
  tooltip: string;
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

const metasItems: SidebarItem[] = [
  {
    href: '/metas',
    icon: <DollarSign size={20} />,
    tooltip: 'Meta Faturamento'
  },
  {
    href: '/metas/produtos',
    icon: <Package size={20} />,
    tooltip: 'Meta Produtos'
  }
];

const dashboardItems: SidebarItem[] = [
  {
    href: '/dashboard/previsao',
    icon: <TrendingUp size={20} />,
    tooltip: 'Previsão de Vendas'
  },
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
    href: '/dashboard/nps',
    icon: <Star size={20} />,
    tooltip: 'NPS'
  },
  {
    href: '/dashboard/empresas',
    icon: <Building2 size={20} />,
    tooltip: 'Empresas'
  },
  {
    href: '/dashboard/empresa',
    icon: <Building size={20} />,
    tooltip: 'Empresa'
  },
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
];

export function Sidebar() {
  const pathname = usePathname();
  const { activeSection, isExpanded, setIsExpanded } = useSidebar();
  const { user } = useAuth();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    // Correspondência exata para itens do sidebar
    return pathname === href;
  };

  // Determinar quais itens mostrar
  let sidebarItems: SidebarItem[] = [];
  
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
  }

  return (
    <aside className={`bg-white border-r border-gray-200 min-h-screen flex flex-col fixed left-0 top-0 z-40 transition-all duration-300 ${isExpanded ? 'w-64' : 'w-16'}`}>
      {/* Header */}
      <div className={`flex items-center ${isExpanded ? 'justify-start gap-3 px-4' : 'justify-center'} p-4 border-b border-gray-200 h-16 transition-all duration-300`}>
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

      {/* Menu */}
      <nav className="flex-1 p-2">
        {sidebarItems.length > 0 ? (
          <ul className="space-y-2">
            {sidebarItems.map((item, index) => {
              const active = isActive(item.href);
              const isFirstItem = index === 0;
              return (
                <li key={item.href} className="relative">
                  {/* Botão de expandir - apenas no primeiro item */}
                  {isFirstItem && (
                    <button
                      onClick={() => setIsExpanded(!isExpanded)}
                      className="absolute -top-1 w-6 h-6 rounded-full bg-white border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50 hover:border-gray-400 transition-colors shadow-sm z-10"
                      style={{ right: '-18px' }}
                      title={isExpanded ? 'Colapsar menu' : 'Expandir menu'}
                    >
                      {isExpanded ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
                    </button>
                  )}
                  <Link href={item.href}>
                    <div
                      className={`w-full flex items-center ${isExpanded ? 'gap-3 px-3' : 'justify-center'} p-3 rounded-lg transition-colors ${
                        active
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                      title={item.tooltip}
                    >
                      {item.icon}
                      {isExpanded && (
                        <span className="text-sm font-medium">{item.tooltip}</span>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
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
