'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { usePagePermissions } from '@/hooks/usePagePermissions';
import { useAuth } from '@/contexts/AuthContext';

export function PageGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const { canViewRoute, loading } = usePagePermissions();

  useEffect(() => {
    if (loading || !user) return;
    
    // Master tem acesso total
    if (user.role === 'master') return;

    // Páginas que não precisam de verificação
    const publicPaths = ['/login', '/nps/'];
    if (publicPaths.some(p => pathname.startsWith(p))) return;

    // Verificar permissão
    if (!canViewRoute(pathname)) {
      console.warn('Acesso negado:', pathname);
      
      // Tentar redirecionar para uma página padrão que o usuário provavelmente tem acesso
      const defaultRoutes = [
        '/dashboard/empresas',
        '/dashboard/empresa',
        '/dashboard/equipe',
        '/dashboard/funcionario',
        '/metas',
        '/cadastros/produtos',
        '/cadastros/funcionarios'
      ];
      
      // Encontrar a primeira rota padrão que o usuário tem acesso
      const accessibleRoute = defaultRoutes.find(route => canViewRoute(route));
      
      if (accessibleRoute) {
        router.push(accessibleRoute);
      } else {
        // Se nenhuma rota padrão estiver acessível, redirecionar para a primeira página disponível
        // ou para uma página de erro
        router.push('/dashboard/empresas');
      }
    }
  }, [pathname, loading, user, canViewRoute, router]);

  return <>{children}</>;
}
