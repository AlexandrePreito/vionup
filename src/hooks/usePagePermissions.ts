'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface PagePermission {
  page_id: string;
  route: string;
  can_view: boolean;
  can_edit: boolean;
}

interface UsePagePermissionsReturn {
  canViewRoute: (route: string) => boolean;
  canEditRoute: (route: string) => boolean;
  loading: boolean;
  permissions: PagePermission[];
}

export function usePagePermissions(): UsePagePermissionsReturn {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<PagePermission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    // Master tem acesso total
    if (user.role === 'master') {
      setLoading(false);
      return;
    }

    const fetchPermissions = async () => {
      try {
        const res = await fetch(`/api/users/${user.id}/permissions`);
        const data = await res.json();
        
        // Buscar páginas para mapear page_id -> route
        const pagesRes = await fetch('/api/modules');
        const pagesData = await pagesRes.json();
        
        const pageMap: Record<string, string> = {};
        pagesData.modules?.forEach((m: any) => {
          m.pages?.forEach((p: any) => {
            pageMap[p.id] = p.route;
          });
        });

        const mapped = (data.pagePermissions || []).map((pp: any) => ({
          ...pp,
          route: pageMap[pp.page_id] || ''
        }));

        setPermissions(mapped);
      } catch (error) {
        console.error('Erro ao buscar permissões:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [user]);

  const canViewRoute = (route: string): boolean => {
    if (!user) return false;
    if (user.role === 'master') return true;
    // Todos os outros roles (group_admin, admin, user) seguem permissões do banco
    return permissions.some(p => {
      // Verificar match exato ou se a rota começa com a permissão
      return (p.route === route || route.startsWith(p.route + '/')) && p.can_view;
    });
  };

  const canEditRoute = (route: string): boolean => {
    if (!user) return false;
    if (user.role === 'master') return true;
    // Todos os outros roles (group_admin, admin, user) seguem permissões do banco
    return permissions.some(p => {
      return (p.route === route || route.startsWith(p.route + '/')) && p.can_edit;
    });
  };

  return { canViewRoute, canEditRoute, loading, permissions };
}
