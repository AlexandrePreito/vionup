-- ============================================================
-- DIAGNÓSTICO: Edecarlos Lima de Souza - Fev/2026 - Sincronização
-- ============================================================
-- Use estas queries para checar se a sincronização está correta
-- e por que o faturamento mostra apenas R$ 1.089,00 (1 dia com 1.1K)

-- ============================================================
-- 1. INFORMAÇÕES DO FUNCIONÁRIO E MAPEAMENTOS
-- ============================================================
-- Encontrar Edecarlos, seus códigos externos e company_group

WITH funcionario AS (
  SELECT 
    e.id as employee_id,
    e.name as employee_name,
    e.code as employee_code,
    e.company_id,
    em.external_employee_id as external_employee_uuid,
    ee.external_id as external_employee_code,
    ee.name as external_employee_name,
    c.id as company_id,
    c.name as company_name,
    cg.id as company_group_id,
    cg.name as company_group_name
  FROM employees e
  LEFT JOIN companies c ON c.id = e.company_id
  LEFT JOIN company_groups cg ON cg.id = c.company_group_id
  LEFT JOIN employee_mappings em ON em.employee_id = e.id AND em.company_group_id = cg.id
  LEFT JOIN external_employees ee ON ee.id = em.external_employee_id
  WHERE (
    LOWER(e.name) LIKE '%edecarlos%' 
    OR LOWER(e.name) LIKE '%lima%'
    OR LOWER(ee.name) LIKE '%edecarlos%'
    OR LOWER(ee.name) LIKE '%lima%'
  )
)
SELECT 
  employee_id,
  employee_name,
  employee_code,
  company_id,
  company_name,
  company_group_id,
  company_group_name,
  external_employee_uuid,
  external_employee_code,
  external_employee_name
FROM funcionario
WHERE external_employee_code IS NOT NULL OR company_group_id IS NOT NULL;

-- ============================================================
-- 2. VENDAS EM FEV/2026 - EXATAMENTE COMO A API BUSCA
-- ============================================================
-- Critério: external_employee_id = external_id (código), sale_uuid NOT NULL

WITH funcionario AS (
  SELECT 
    ee.external_id as external_employee_code,
    cg.id as company_group_id,
    e.name as employee_name
  FROM employees e
  LEFT JOIN companies c ON c.id = e.company_id
  LEFT JOIN company_groups cg ON cg.id = c.company_group_id
  LEFT JOIN employee_mappings em ON em.employee_id = e.id AND em.company_group_id = cg.id
  LEFT JOIN external_employees ee ON ee.id = em.external_employee_id
  WHERE (
    LOWER(e.name) LIKE '%edecarlos%' 
    OR LOWER(e.name) LIKE '%lima%'
    OR LOWER(ee.name) LIKE '%edecarlos%'
    OR LOWER(ee.name) LIKE '%lima%'
  )
  AND ee.external_id IS NOT NULL
  AND cg.id IS NOT NULL
  LIMIT 1
)
SELECT 
  f.employee_name,
  f.external_employee_code,
  COUNT(*) as total_registros,
  COUNT(DISTINCT es.sale_uuid) as vendas_distintas,
  ROUND(SUM(es.total_value)::numeric, 2) as faturamento_total,
  ROUND(SUM(es.total_value)::numeric / NULLIF(COUNT(DISTINCT es.sale_uuid), 0), 2) as ticket_medio,
  MIN(es.sale_date) as primeira_venda,
  MAX(es.sale_date) as ultima_venda,
  COUNT(*) FILTER (WHERE es.sale_uuid IS NULL) as registros_sem_sale_uuid
FROM external_sales es
CROSS JOIN funcionario f
WHERE 
  es.company_group_id = f.company_group_id
  AND es.external_employee_id = f.external_employee_code
  AND es.sale_date >= '2026-02-01'
  AND es.sale_date <= '2026-02-28'
  AND es.sale_uuid IS NOT NULL
GROUP BY f.employee_name, f.external_employee_code;

-- ============================================================
-- 3. VENDAS POR DIA (comparar com gráfico)
-- ============================================================

WITH funcionario AS (
  SELECT ee.external_id as code, cg.id as group_id
  FROM employees e
  LEFT JOIN companies c ON c.id = e.company_id
  LEFT JOIN company_groups cg ON cg.id = c.company_group_id
  LEFT JOIN employee_mappings em ON em.employee_id = e.id AND em.company_group_id = cg.id
  LEFT JOIN external_employees ee ON ee.id = em.external_employee_id
  WHERE (LOWER(e.name) LIKE '%edecarlos%' OR LOWER(e.name) LIKE '%lima%')
    AND ee.external_id IS NOT NULL AND cg.id IS NOT NULL
  LIMIT 1
)
SELECT 
  EXTRACT(DAY FROM es.sale_date)::int as dia,
  es.sale_date,
  COUNT(DISTINCT es.sale_uuid) as vendas,
  ROUND(SUM(es.total_value)::numeric, 2) as faturamento
FROM external_sales es
CROSS JOIN funcionario f
WHERE es.company_group_id = f.group_id
  AND es.external_employee_id = f.code
  AND es.sale_date >= '2026-02-01'
  AND es.sale_date <= '2026-02-28'
  AND es.sale_uuid IS NOT NULL
GROUP BY es.sale_date
ORDER BY es.sale_date;

-- ============================================================
-- 4. VERIFICAR SE HÁ VENDAS COM external_employee_id DIFERENTE
-- ============================================================
-- Talvez as vendas estejam com UUID em vez de código, ou outro código

WITH funcionario AS (
  SELECT ee.external_id as code, ee.id as uuid, cg.id as group_id
  FROM employees e
  LEFT JOIN companies c ON c.id = e.company_id
  LEFT JOIN company_groups cg ON cg.id = c.company_group_id
  LEFT JOIN employee_mappings em ON em.employee_id = e.id AND em.company_group_id = cg.id
  LEFT JOIN external_employees ee ON ee.id = em.external_employee_id
  WHERE (LOWER(e.name) LIKE '%edecarlos%' OR LOWER(e.name) LIKE '%lima%')
    AND ee.external_id IS NOT NULL AND cg.id IS NOT NULL
  LIMIT 1
)
SELECT 
  es.external_employee_id,
  CASE 
    WHEN es.external_employee_id = f.code THEN 'MATCH código'
    WHEN es.external_employee_id = f.uuid::text THEN 'MATCH UUID (API não usa!)'
    ELSE 'OUTRO'
  END as tipo_match,
  COUNT(*) as registros,
  COUNT(DISTINCT es.sale_uuid) as vendas,
  ROUND(SUM(es.total_value)::numeric, 2) as faturamento
FROM external_sales es
CROSS JOIN funcionario f
WHERE es.company_group_id = f.group_id
  AND es.sale_date >= '2026-02-01'
  AND es.sale_date <= '2026-02-28'
  AND (es.external_employee_id = f.code OR es.external_employee_id = f.uuid::text)
  AND es.sale_uuid IS NOT NULL
GROUP BY es.external_employee_id, f.code, f.uuid;

-- ============================================================
-- 5. TOTAL DE VENDAS NO GRUPO EM FEV/2026 (referência)
-- ============================================================
-- Ver se há dados sincronizados no geral

SELECT 
  COUNT(*) as total_registros_grupo,
  COUNT(DISTINCT external_employee_id) as funcionarios_com_vendas,
  ROUND(SUM(total_value)::numeric, 2) as faturamento_total,
  MIN(sale_date) as primeira_venda,
  MAX(sale_date) as ultima_venda
FROM external_sales
WHERE company_group_id = (
  SELECT cg2.id FROM employees e
  JOIN companies c2 ON c2.id = e.company_id
  JOIN company_groups cg2 ON cg2.id = c2.company_group_id
  WHERE LOWER(e.name) LIKE '%edecarlos%' LIMIT 1
)
AND sale_date >= '2026-02-01'
AND sale_date <= '2026-02-28'
AND sale_uuid IS NOT NULL;

-- ============================================================
-- 6. STATUS DA SINCRONIZAÇÃO (sync_queue)
-- ============================================================
-- Ver se a sincronização de vendas rodou em fev/2026

SELECT 
  sq.id,
  sq.start_date,
  sq.end_date,
  sq.status,
  sq.sync_type,
  sq.processed_days,
  sq.total_days,
  sq.processed_records,
  sq.error_message,
  sq.finished_at
FROM sync_queue sq
JOIN powerbi_connections pc ON pc.id = sq.connection_id
JOIN company_groups cg ON cg.id = sq.company_group_id
WHERE sq.company_group_id = (
  SELECT cg2.id FROM employees e
  JOIN companies c2 ON c2.id = e.company_id
  JOIN company_groups cg2 ON cg2.id = c2.company_group_id
  WHERE LOWER(e.name) LIKE '%edecarlos%' LIMIT 1
)
AND sq.start_date <= '2026-02-28'
AND sq.end_date >= '2026-02-01'
ORDER BY sq.created_at DESC
LIMIT 10;

-- ============================================================
-- 7. REGISTROS COM sale_uuid NULL (a API ignora estes!)
-- ============================================================
-- Se houver muitos, a sincronização pode estar gravando errado

WITH funcionario AS (
  SELECT ee.external_id as code, cg.id as group_id
  FROM employees e
  LEFT JOIN companies c ON c.id = e.company_id
  LEFT JOIN company_groups cg ON cg.id = c.company_group_id
  LEFT JOIN employee_mappings em ON em.employee_id = e.id AND em.company_group_id = cg.id
  LEFT JOIN external_employees ee ON ee.id = em.external_employee_id
  WHERE (LOWER(e.name) LIKE '%edecarlos%' OR LOWER(e.name) LIKE '%lima%')
    AND ee.external_id IS NOT NULL AND cg.id IS NOT NULL
  LIMIT 1
)
SELECT 
  COUNT(*) FILTER (WHERE es.sale_uuid IS NULL) as com_sale_uuid_null,
  COUNT(*) FILTER (WHERE es.sale_uuid IS NOT NULL) as com_sale_uuid,
  ROUND(SUM(es.total_value) FILTER (WHERE es.sale_uuid IS NULL)::numeric, 2) as valor_ignorado_pela_api
FROM external_sales es
CROSS JOIN funcionario f
WHERE es.company_group_id = f.group_id
  AND es.external_employee_id = f.code
  AND es.sale_date >= '2026-02-01'
  AND es.sale_date <= '2026-02-28';
