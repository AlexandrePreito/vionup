-- Query COMPLETA para buscar vendas do Edecarlos Lima de Souza em Janeiro de 2026
-- Esta query encontra automaticamente todos os IDs necessários e retorna os dados

-- ============================================================
-- QUERY PRINCIPAL - Execute esta e ela faz tudo automaticamente
-- ============================================================

WITH funcionario_info AS (
  -- Encontrar o funcionário e seus códigos externos
  SELECT 
    e.id as employee_id,
    e.name as employee_name,
    e.code as employee_code,
    ee.id as external_employee_uuid,
    ee.external_id as external_employee_code,
    ee.name as external_employee_name,
    c.id as company_id,
    c.name as company_name,
    cg.id as company_group_id,
    cg.name as company_group_name
  FROM employees e
  LEFT JOIN employee_mappings em ON em.employee_id = e.id
  LEFT JOIN external_employees ee ON ee.id = em.external_employee_id
  LEFT JOIN companies c ON c.id = e.company_id
  LEFT JOIN company_groups cg ON cg.id = c.company_group_id
  WHERE (
    LOWER(e.name) LIKE '%edecarlos%' 
    OR LOWER(e.name) LIKE '%lima%'
    OR LOWER(ee.name) LIKE '%edecarlos%'
    OR LOWER(ee.name) LIKE '%lima%'
  )
  AND ee.external_id IS NOT NULL
  AND cg.id IS NOT NULL
)
SELECT 
  -- Informações do funcionário
  fi.employee_id,
  fi.employee_name as nome_funcionario,
  fi.employee_code as codigo_funcionario,
  fi.external_employee_code as codigo_externo,
  fi.company_id,
  fi.company_name as nome_empresa,
  fi.company_group_id as group_id,
  fi.company_group_name as nome_grupo,
  
  -- Estatísticas de vendas em Janeiro de 2026
  COUNT(*) as total_registros,
  COUNT(DISTINCT es.sale_uuid) as quantidade_vendas_distintas,
  SUM(es.total_value) as valor_total_vendas,
  SUM(es.quantity) as quantidade_total_itens,
  
  -- Datas
  MIN(es.sale_date) as primeira_venda,
  MAX(es.sale_date) as ultima_venda,
  
  -- Cálculos
  ROUND(SUM(es.total_value) / NULLIF(COUNT(DISTINCT es.sale_uuid), 0), 2) as ticket_medio,
  ROUND(SUM(es.total_value) / NULLIF(SUM(es.quantity), 0), 2) as valor_medio_por_item
  
FROM external_sales es
CROSS JOIN funcionario_info fi
WHERE 
  es.company_group_id = fi.company_group_id
  AND es.external_employee_id = fi.external_employee_code
  AND es.sale_date >= '2026-01-01'
  AND es.sale_date <= '2026-01-31'
  AND es.sale_uuid IS NOT NULL
GROUP BY 
  fi.employee_id,
  fi.employee_name,
  fi.employee_code,
  fi.external_employee_code,
  fi.company_id,
  fi.company_name,
  fi.company_group_id,
  fi.company_group_name;

-- ============================================================
-- QUERY ALTERNATIVA - Se a query acima não retornar resultados
-- ============================================================
-- Execute esta para ver TODOS os funcionários e escolher manualmente

SELECT 
  e.id as employee_id,
  e.name as employee_name,
  e.code as employee_code,
  ee.external_id as external_employee_code,
  ee.name as external_employee_name,
  c.id as company_id,
  c.name as company_name,
  cg.id as company_group_id,
  cg.name as company_group_name
FROM employees e
LEFT JOIN employee_mappings em ON em.employee_id = e.id
LEFT JOIN external_employees ee ON ee.id = em.external_employee_id
LEFT JOIN companies c ON c.id = e.company_id
LEFT JOIN company_groups cg ON cg.id = c.company_group_id
WHERE ee.external_id IS NOT NULL
  AND cg.id IS NOT NULL
ORDER BY e.name;

-- ============================================================
-- QUERY SIMPLIFICADA - Apenas os valores principais
-- ============================================================

WITH funcionario AS (
  SELECT 
    ee.external_id as external_employee_code,
    cg.id as company_group_id
  FROM employees e
  LEFT JOIN employee_mappings em ON em.employee_id = e.id
  LEFT JOIN external_employees ee ON ee.id = em.external_employee_id
  LEFT JOIN companies c ON c.id = e.company_id
  LEFT JOIN company_groups cg ON cg.id = c.company_group_id
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
  COUNT(DISTINCT es.sale_uuid) as quantidade_vendas,
  SUM(es.total_value) as valor_total_vendas,
  ROUND(SUM(es.total_value) / NULLIF(COUNT(DISTINCT es.sale_uuid), 0), 2) as ticket_medio
FROM external_sales es
CROSS JOIN funcionario f
WHERE 
  es.company_group_id = f.company_group_id
  AND es.external_employee_id = f.external_employee_code
  AND es.sale_date >= '2026-01-01'
  AND es.sale_date <= '2026-01-31'
  AND es.sale_uuid IS NOT NULL;

-- ============================================================
-- QUERY PARA VERIFICAR SE HÁ DADOS NA TABELA
-- ============================================================
-- Execute esta para ver se há vendas do funcionário no período

WITH funcionario AS (
  SELECT 
    e.name as employee_name,
    ee.external_id as external_employee_code,
    cg.id as company_group_id,
    cg.name as group_name
  FROM employees e
  LEFT JOIN employee_mappings em ON em.employee_id = e.id
  LEFT JOIN external_employees ee ON ee.id = em.external_employee_id
  LEFT JOIN companies c ON c.id = e.company_id
  LEFT JOIN company_groups cg ON cg.id = c.company_group_id
  WHERE (
    LOWER(e.name) LIKE '%edecarlos%' 
    OR LOWER(e.name) LIKE '%lima%'
    OR LOWER(ee.name) LIKE '%edecarlos%'
    OR LOWER(ee.name) LIKE '%lima%'
  )
  AND ee.external_id IS NOT NULL
  AND cg.id IS NOT NULL
)
SELECT 
  f.employee_name,
  f.external_employee_code,
  f.company_group_id,
  f.group_name,
  COUNT(*) as total_registros_encontrados,
  COUNT(DISTINCT es.sale_uuid) as vendas_distintas,
  SUM(es.total_value) as valor_total_vendas,
  ROUND(SUM(es.total_value) / NULLIF(COUNT(DISTINCT es.sale_uuid), 0), 2) as ticket_medio,
  MIN(es.sale_date) as primeira_venda,
  MAX(es.sale_date) as ultima_venda
FROM external_sales es
CROSS JOIN funcionario f
WHERE 
  es.company_group_id = f.company_group_id
  AND es.external_employee_id = f.external_employee_code
  AND es.sale_date >= '2026-01-01'
  AND es.sale_date <= '2026-01-31'
GROUP BY f.employee_name, f.external_employee_code, f.company_group_id, f.group_name;
