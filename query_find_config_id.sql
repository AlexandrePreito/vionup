-- ============================================================
-- QUERY PARA ENCONTRAR O CONFIG_ID DA CONFIGURAÇÃO
-- ============================================================

-- Opção 1: Listar TODAS as configurações de sincronização
SELECT 
  sc.id as config_id,
  sc.entity_type as tipo_entidade,
  sc.is_incremental as sincronizacao_incremental,
  sc.incremental_days as dias_incrementais,
  sc.initial_date as data_inicial,
  sc.last_sync_at as ultima_sincronizacao,
  sc.last_sync_count as total_registros_ultima_sync,
  c.name as nome_conexao,
  c.company_group_id,
  cg.name as grupo_empresa
FROM powerbi_sync_configs sc
INNER JOIN powerbi_connections c ON sc.connection_id = c.id
LEFT JOIN company_groups cg ON cg.id = c.company_group_id
ORDER BY sc.entity_type;

-- ============================================================
-- Opção 2: Listar APENAS configurações de CAIXA (cash_flow)
-- ============================================================
SELECT 
  sc.id as config_id,
  sc.entity_type as tipo_entidade,
  sc.is_incremental as sincronizacao_incremental,
  sc.incremental_days as dias_incrementais,
  sc.initial_date as data_inicial,
  sc.last_sync_at as ultima_sincronizacao,
  sc.last_sync_count as total_registros_ultima_sync,
  c.name as nome_conexao,
  cg.name as grupo_empresa
FROM powerbi_sync_configs sc
INNER JOIN powerbi_connections c ON sc.connection_id = c.id
LEFT JOIN company_groups cg ON cg.id = c.company_group_id
WHERE sc.entity_type = 'cash_flow'
ORDER BY sc.last_sync_at DESC NULLS LAST;

-- ============================================================
-- Opção 3: Buscar por nome da conexão (se você souber)
-- ============================================================
-- Substitua 'Aquarius' pelo nome da sua conexão
SELECT 
  sc.id as config_id,
  sc.entity_type as tipo_entidade,
  c.name as nome_conexao,
  sc.last_sync_at as ultima_sincronizacao
FROM powerbi_sync_configs sc
INNER JOIN powerbi_connections c ON sc.connection_id = c.id
WHERE c.name ILIKE '%Aquarius%'  -- ⚠️ Ajuste o nome se necessário
ORDER BY sc.entity_type;

-- ============================================================
-- Opção 4: Buscar por grupo de empresa
-- ============================================================
-- Substitua 'SEU_GROUP_ID' pelo ID do grupo de empresa
SELECT 
  sc.id as config_id,
  sc.entity_type as tipo_entidade,
  c.name as nome_conexao,
  cg.name as grupo_empresa,
  sc.last_sync_at as ultima_sincronizacao
FROM powerbi_sync_configs sc
INNER JOIN powerbi_connections c ON sc.connection_id = c.id
LEFT JOIN company_groups cg ON cg.id = c.company_group_id
WHERE c.company_group_id = 'SEU_GROUP_ID'  -- ⚠️ Substitua pelo ID do grupo
ORDER BY sc.entity_type;
