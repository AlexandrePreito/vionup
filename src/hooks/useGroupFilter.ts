import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook para gerenciar filtro de grupo com base no role do usuário
 * - Master: pode escolher qualquer grupo
 * - Não-master: grupo fixo e desabilitado
 */
export function useGroupFilter() {
  const { user: currentUser } = useAuth();
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');

  // Buscar grupos
  useEffect(() => {
    console.log('useGroupFilter - Buscando grupos...');
    console.log('useGroupFilter - Usuário atual:', currentUser ? { id: currentUser.id, role: currentUser.role } : 'null');
    
    // Buscar grupos incluindo inativos temporariamente para debug
    fetch('/api/groups?include_inactive=true')
      .then(res => {
        console.log('useGroupFilter - Status da resposta:', res.status);
        if (!res.ok) {
          console.error('useGroupFilter - Erro na resposta:', res.status, res.statusText);
          return res.json().then(err => { throw new Error(err.error || 'Erro ao buscar grupos'); });
        }
        return res.json();
      })
      .then(data => {
        console.log('useGroupFilter - Dados recebidos:', data);
        const groupsArray = data?.groups || [];
        console.log('useGroupFilter - Grupos encontrados:', groupsArray.length);
        
        // Mostrar informações de debug se não houver grupos
        if (groupsArray.length === 0 && data?.debug) {
          console.warn('useGroupFilter - DEBUG: Nenhum grupo encontrado');
          console.warn('useGroupFilter - DEBUG:', {
            userRole: data.debug.userRole,
            includeInactive: data.debug.includeInactive,
            totalGroupsInDb: data.debug.totalGroupsInDb,
            groupsInDb: data.debug.groupsInDb,
            error: data.debug.error
          });
          
          if (data.debug.totalGroupsInDb === 0) {
            console.warn('useGroupFilter - Não há grupos cadastrados no banco de dados. Acesse /grupos para criar um grupo.');
          } else {
            console.warn('useGroupFilter - Há grupos no banco, mas não foram retornados. Verifique os filtros aplicados.');
          }
        }
        
        if (groupsArray.length > 0) {
          console.log('useGroupFilter - Primeiros grupos:', groupsArray.slice(0, 3).map((g: any) => ({ id: g.id, name: g.name, is_active: g.is_active })));
        }
        setGroups(Array.isArray(groupsArray) ? groupsArray : []);
      })
      .catch(err => {
        console.error('useGroupFilter - Erro ao buscar grupos:', err);
        setGroups([]);
      });
  }, [currentUser]);

  // Definir grupo automaticamente se não for master
  useEffect(() => {
    const isNotMaster = currentUser && currentUser.role !== 'master';
    
    if (isNotMaster && currentUser.company_group_id) {
      console.log('useGroupFilter - Definindo grupo automaticamente:', currentUser.company_group_id);
      setSelectedGroupId(currentUser.company_group_id);
    } else {
      console.log('useGroupFilter - Usuário:', currentUser ? { id: currentUser.id, role: currentUser.role, company_group_id: currentUser.company_group_id } : 'null');
    }
  }, [currentUser]);

  const isGroupReadOnly = currentUser && currentUser.role !== 'master';
  const fixedGroupId = currentUser && currentUser.role !== 'master' 
    ? (currentUser.company_group_id || '')
    : null;
  
  // Obter nome do grupo: primeiro tenta do currentUser, depois da lista de grupos
  const groupName = fixedGroupId 
    ? (currentUser?.company_group?.name || groups.find(g => g.id === fixedGroupId)?.name || '')
    : '';

  return {
    groups,
    selectedGroupId,
    setSelectedGroupId,
    isGroupReadOnly,
    fixedGroupId,
    groupName,
    canChangeGroup: currentUser?.role === 'master'
  };
}
