-- ============================================================
-- QUERY SIMPLIFICADA PARA VERIFICAR ESTATÍSTICAS DE CAIXA
-- ============================================================
-- 
-- INSTRUÇÕES:
-- 1. Substitua 'SEU_CONFIG_ID' pelo ID da configuração de caixa
-- 2. Execute no Supabase SQL Editor
-- 3. Compare os resultados com o que aparece no painel de detalhes
--
-- Para encontrar o config_id:
-- SELECT id, entity_type, name FROM powerbi_sync_configs WHERE entity_type = 'cash_flow';

WITH config_info AS (
  SELECT 
    sc.id as config_id,
    sc.entity_type,
    sc.is_incremental,
    COALESCE(sc.incremental_days, 7) as incremental_days,
    sc.initial_date,
    sc.last_sync_at,
    c.company_group_id,
    c.name as connection_name
  FROM powerbi_sync_configs sc
  INNER JOIN powerbi_connections c ON sc.connection_id = c.id
  WHERE sc.id = '898f49f6-3c8a-4eff-8ca6-f4b7a1599ee3' -- ⚠️ Config Aquarius - cash_flow
    AND sc.entity_type = 'cash_flow'
),
period_calc AS (
  SELECT 
    *,
    CASE 
      WHEN is_incremental THEN 
        CURRENT_DATE - incremental_days
      WHEN initial_date IS NOT NULL THEN 
        initial_date::date
      ELSE 
        CURRENT_DATE - 30
    END as filter_start_date,
    CURRENT_DATE as filter_end_date
  FROM config_info
)
SELECT 
  -- Informações da configuração
  pc.config_id,
  pc.connection_name,
  pc.is_incremental,
  pc.incremental_days,
  pc.initial_date,
  pc.last_sync_at,
  pc.filter_start_date as periodo_inicio,
  pc.filter_end_date as periodo_fim,
  
  -- Informações da empresa
  c.id as company_id,
  c.name as empresa,
  ec.external_id as codigo_externo,
  
  -- Estatísticas
  COUNT(cf.id) as total_registros,
  MIN(cf.transaction_date) as data_inicial,
  MAX(cf.transaction_date) as data_final

FROM period_calc pc
INNER JOIN external_cash_flow cf ON 
  cf.company_group_id = pc.company_group_id
  AND cf.external_company_id IS NOT NULL
  AND cf.transaction_date >= pc.filter_start_date
  AND cf.transaction_date <= pc.filter_end_date
INNER JOIN external_companies ec ON 
  ec.company_group_id = pc.company_group_id
  AND ec.external_id = cf.external_company_id
INNER JOIN company_mappings cm ON 
  cm.company_group_id = pc.company_group_id
  AND cm.external_company_id = ec.id
INNER JOIN companies c ON c.id = cm.company_id

GROUP BY 
  pc.config_id,
  pc.connection_name,
  pc.is_incremental,
  pc.incremental_days,
  pc.initial_date,
  pc.last_sync_at,
  pc.filter_start_date,
  pc.filter_end_date,
  c.id,
  c.name,
  ec.external_id

ORDER BY c.name;

-- ============================================================
-- QUERY ALTERNATIVA: Ver todos os registros sem agrupar
-- ============================================================
/*
SELECT 
  c.name as empresa,
  ec.external_id as codigo_externo,
  cf.transaction_date,
  cf.amount,
  cf.payment_method,
  cf.transaction_type
FROM external_cash_flow cf
INNER JOIN external_companies ec ON 
  ec.company_group_id = cf.company_group_id
  AND ec.external_id = cf.external_company_id
INNER JOIN company_mappings cm ON 
  cm.company_group_id = cf.company_group_id
  AND cm.external_company_id = ec.id
INNER JOIN companies c ON c.id = cm.company_id
WHERE 
  cf.company_group_id = 'SEU_COMPANY_GROUP_ID' -- ⚠️ SUBSTITUA
  AND cf.external_company_id IS NOT NULL
  AND cf.transaction_date >= CURRENT_DATE - 7  -- Últimos 7 dias (ajuste conforme necessário)
  AND cf.transaction_date <= CURRENT_DATE
ORDER BY c.name, cf.transaction_date DESC
LIMIT 100;
*/
