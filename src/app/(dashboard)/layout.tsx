'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { SidebarProvider, useSidebar } from '@/contexts/sidebar-context';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { PageGuard } from '@/components/PageGuard';

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { isExpanded } = useSidebar();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);

  // Mapeamento de rotas para nomes de páginas
  const getPageTitle = (path: string): string => {
    const routeMap: Record<string, string> = {
      '/powerbi/sincronizacao': 'Sincronização',
      '/powerbi/conexoes': 'Conexões Power BI',
      '/dashboard/empresa': 'Dashboard Empresa',
      '/dashboard/empresas': 'Dashboard Empresas',
      '/dashboard/funcionario': 'Dashboard Funcionário',
      '/dashboard/equipe': 'Dashboard Equipe',
      '/dashboard/previsao': 'Previsão',
      '/dashboard/realizado': 'Realizado',
      '/dashboard/realizado-mes': 'Realizado do Mês',
      '/dashboard/nps': 'Dashboard NPS',
      '/dashboard/importar': 'Importar Dados',
      '/cadastros/produtos': 'Produtos',
      '/cadastros/funcionarios': 'Funcionários',
      '/cadastros/turnos': 'Turnos',
      '/cadastros/modo-venda': 'Modo de Venda',
      '/cadastros/categorias': 'Categorias',
      '/metas': 'Metas',
      '/metas/produtos': 'Metas de Produtos',
      '/metas/pesquisas': 'Metas de Pesquisas',
      '/metas/qualidade': 'Metas de Qualidade',
      '/compras/materias-primas': 'Matérias-Primas',
      '/compras/projecao-mp': 'Projeção de Matérias-Primas',
      '/compras/projecao-revenda': 'Projeção de Revenda',
      '/conciliacao/empresas': 'Conciliação de Empresas',
      '/conciliacao/funcionarios': 'Conciliação de Funcionários',
      '/conciliacao/produtos': 'Conciliação de Produtos',
      '/conciliacao/categorias': 'Conciliação de Categorias',
      '/grupos': 'Grupos',
      '/empresas': 'Empresas',
      '/usuarios': 'Usuários',
      '/nps': 'NPS (Interno)',
      '/nps/configuracoes': 'Configurações NPS',
      '/nps/links': 'Links NPS',
      '/nps/perguntas': 'Perguntas NPS',
      '/nps/pesquisas': 'Pesquisas NPS',
      '/nps/respostas': 'Respostas NPS',
    };

    // Buscar correspondência exata primeiro
    if (routeMap[path]) {
      return routeMap[path];
    }

    // Buscar correspondência parcial (para rotas com parâmetros)
    for (const [route, title] of Object.entries(routeMap)) {
      if (path.startsWith(route)) {
        return title;
      }
    }

    // Se não encontrar, gerar título a partir do path
    const segments = path.split('/').filter(Boolean);
    if (segments.length > 0) {
      const lastSegment = segments[segments.length - 1];
      // Capitalizar primeira letra e substituir hífens por espaços
      return lastSegment
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }

    return 'Dashboard';
  };

  useEffect(() => {
    // Atualizar título da página
    const pageTitle = getPageTitle(pathname);
    document.title = `Vion Up! ${pageTitle}`;
  }, [pathname]);

  useEffect(() => {
    // Mostrar loading ao mudar de rota
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500); // Delay para suavizar a transição

    return () => clearTimeout(timer);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-gray-100">
      <Sidebar />
      <Header />
      {isLoading && <LoadingSpinner />}
      <main className={`pt-16 pb-6 px-6 transition-all duration-300 ${isExpanded ? 'ml-64' : 'ml-16'}`}>
        <PageGuard>
          {children}
        </PageGuard>
      </main>
    </div>
  );
}

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [user, isLoading, router]);

  // Mostra loading enquanto verifica autenticação
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Se não tem usuário, não renderiza nada (vai redirecionar)
  if (!user) {
    return null;
  }

  return <DashboardContent>{children}</DashboardContent>;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AuthenticatedLayout>{children}</AuthenticatedLayout>
    </SidebarProvider>
  );
}
