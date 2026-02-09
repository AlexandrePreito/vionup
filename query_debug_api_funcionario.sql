-- Query para debugar o que a API está buscando
-- Use esta query para comparar com os valores retornados pela API

-- PRIMEIRO: Encontrar o employee_id e os códigos externos
-- Substitua '21312a1e-d7d7-4b6a-ae5c-94db86ca5cba' pelo employee_id que aparece nos logs

WITH funcionario_info AS (
  SELECT 
    e.id as employee_id,
    e.name as employee_name,
    em.external_employee_id as external_employee_uuid,
    ee.external_id as external_employee_code,
    ee.name as external_employee_name,
    cg.id as company_group_id,
    cg.name as company_group_name
  FROM employees e
  LEFT JOIN employee_mappings em ON em.employee_id = e.id
  LEFT JOIN external_employees ee ON ee.id = em.external_employee_id
  LEFT JOIN companies c ON c.id = e.company_id
  LEFT JOIN company_groups cg ON cg.id = c.company_group_id
  WHERE e.id = '21312a1e-d7d7-4b6a-ae5c-94db86ca5cba'  -- ⚠️ Substitua pelo employee_id dos logs
    AND cg.id = 'e48b81a9-97b5-4299-8cea-dce3ee919f5f'  -- ⚠️ Substitua pelo group_id dos logs
    AND ee.external_id IS NOT NULL
)
SELECT 
  -- Informações do funcionário
  fi.employee_id,
  fi.employee_name,
  fi.external_employee_code,
  fi.company_group_id,
  
  -- Estatísticas de vendas em Janeiro de 2026 (month = 1)
  COUNT(*) as total_registros,
  COUNT(DISTINCT es.sale_uuid) as quantidade_vendas_distintas,
  SUM(es.total_value) as valor_total_vendas,
  
  -- Cálculos
  ROUND(SUM(es.total_value) / NULLIF(COUNT(DISTINCT es.sale_uuid), 0), 2) as ticket_medio,
  
  -- Datas
  MIN(es.sale_date) as primeira_venda,
  MAX(es.sale_date) as ultima_venda,
  
  -- Debug: verificar se há registros com sale_uuid NULL
  COUNT(*) FILTER (WHERE es.sale_uuid IS NULL) as registros_sem_sale_uuid
  
FROM external_sales es
CROSS JOIN funcionario_info fi
WHERE 
  es.company_group_id = fi.company_group_id
  AND es.external_employee_id = fi.external_employee_code
  AND es.sale_date >= '2026-01-01'
  AND es.sale_date <= '2026-01-31'
  AND es.sale_uuid IS NOT NULL  -- ⚠️ A API filtra por este campo
GROUP BY 
  fi.employee_id,
  fi.employee_name,
  fi.external_employee_code,
  fi.company_group_id;

-- ============================================================
-- QUERY PARA VER TODOS OS CÓDIGOS EXTERNOS DO FUNCIONÁRIO
-- ============================================================
-- Execute esta para ver todos os mapeamentos

SELECT 
  e.id as employee_id,
  e.name as employee_name,
  em.external_employee_id as external_employee_uuid,
  ee.external_id as external_employee_code,
  ee.name as external_employee_name,
  cg.id as company_group_id,
  cg.name as company_group_name
FROM employees e
LEFT JOIN employee_mappings em ON em.employee_id = e.id
LEFT JOIN external_employees ee ON ee.id = em.external_employee_id
LEFT JOIN companies c ON c.id = e.company_id
LEFT JOIN company_groups cg ON cg.id = c.company_group_id
WHERE e.id = '21312a1e-d7d7-4b6a-ae5c-94db86ca5cba'  -- ⚠️ Substitua pelo employee_id
  AND cg.id = 'e48b81a9-97b5-4299-8cea-dce3ee919f5f'  -- ⚠️ Substitua pelo group_id
ORDER BY ee.external_id;

-- ============================================================
-- QUERY PARA VERIFICAR VENDAS POR CÓDIGO EXTERNO
-- ============================================================
-- Execute esta para ver vendas de cada código externo separadamente

SELECT 
  es.external_employee_id,
  COUNT(*) as total_registros,
  COUNT(DISTINCT es.sale_uuid) as vendas_distintas,
  SUM(es.total_value) as valor_total
FROM external_sales es
WHERE 
  es.company_group_id = 'e48b81a9-97b5-4299-8cea-dce3ee919f5f'  -- ⚠️ Substitua pelo group_id
  AND es.external_employee_id IN (
    SELECT ee.external_id
    FROM employees e
    LEFT JOIN employee_mappings em ON em.employee_id = e.id
    LEFT JOIN external_employees ee ON ee.id = em.external_employee_id
    WHERE e.id = '21312a1e-d7d7-4b6a-ae5c-94db86ca5cba'  -- ⚠️ Substitua pelo employee_id
  )
  AND es.sale_date >= '2026-01-01'
  AND es.sale_date <= '2026-01-31'
  AND es.sale_uuid IS NOT NULL
GROUP BY es.external_employee_id
ORDER BY valor_total DESC;
