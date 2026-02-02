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
    
    fetch('/api/groups')
      .then(res => {
        console.log('useGroupFilter - Status da resposta:', res.status);
        return res.json();
      })
      .then(data => {
        console.log('useGroupFilter - Dados recebidos:', data);
        const groupsArray = data?.groups || [];
        console.log('useGroupFilter - Grupos encontrados:', groupsArray.length);
        setGroups(Array.isArray(groupsArray) ? groupsArray : []);
      })
      .catch(err => {
        console.error('useGroupFilter - Erro ao buscar grupos:', err);
        setGroups([]);
      });
  }, [currentUser]);

  // Definir grupo automaticamente se não for master
  useEffect(() => {
    // Aceitar tanto 'admin' quanto 'group_admin' temporariamente (compatibilidade)
    const isNotMaster = currentUser && currentUser.role !== 'master' && 
                       (currentUser.role === 'admin' || currentUser.role === 'group_admin' || currentUser.role === 'company_admin' || currentUser.role === 'user');
    
    if (isNotMaster && currentUser.company_group_id) {
      console.log('useGroupFilter - Definindo grupo automaticamente:', currentUser.company_group_id);
      setSelectedGroupId(currentUser.company_group_id);
    } else {
      console.log('useGroupFilter - Usuário:', currentUser ? { id: currentUser.id, role: currentUser.role, company_group_id: currentUser.company_group_id } : 'null');
    }
  }, [currentUser]);

  // Aceitar tanto 'admin' quanto 'group_admin' temporariamente (compatibilidade)
  const isGroupReadOnly = currentUser && currentUser.role !== 'master' && 
                         (currentUser.role === 'admin' || currentUser.role === 'group_admin' || currentUser.role === 'company_admin' || currentUser.role === 'user');
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
