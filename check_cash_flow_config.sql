-- ============================================================
-- VERIFICAR CONFIGURAÇÃO DE CAIXA
-- ============================================================
-- Execute esta query no Supabase SQL Editor para verificar
-- se a Query DAX do Caixa está salva corretamente

SELECT 
  id,
  entity_type,
  connection_id,
  dataset_id,
  dax_query,
  date_field,
  is_incremental,
  incremental_days,
  initial_date,
  is_active,
  created_at,
  updated_at
FROM powerbi_sync_configs
WHERE entity_type = 'cash_flow'
ORDER BY updated_at DESC;

-- ============================================================
-- VERIFICAR SE A QUERY ESTÁ VAZIA OU NULA
-- ============================================================
SELECT 
  id,
  entity_type,
  CASE 
    WHEN dax_query IS NULL THEN 'NULL'
    WHEN TRIM(dax_query) = '' THEN 'VAZIA'
    ELSE 'PREENCHIDA'
  END as status_query,
  LENGTH(dax_query) as tamanho_query,
  LEFT(dax_query, 100) as preview_query
FROM powerbi_sync_configs
WHERE entity_type = 'cash_flow';

-- ============================================================
-- VERIFICAR TODAS AS CONFIGURAÇÕES (para referência)
-- ============================================================
SELECT 
  entity_type,
  CASE 
    WHEN dax_query IS NULL THEN 'NULL'
    WHEN TRIM(dax_query) = '' THEN 'VAZIA'
    ELSE 'OK'
  END as status_query,
  LEFT(dax_query, 50) as preview
FROM powerbi_sync_configs
ORDER BY entity_type;
