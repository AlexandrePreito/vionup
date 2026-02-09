-- Query para buscar vendas do funcionário Edecarlos Lima de Souza em Janeiro de 2026
-- Esta query busca o valor total e a quantidade de vendas

-- PRIMEIRO: Encontrar o external_employee_id do funcionário
-- Execute esta parte para encontrar o código externo
SELECT 
  e.id as employee_id,
  e.name as employee_name,
  e.code as employee_code,
  ee.id as external_employee_uuid,
  ee.external_id as external_employee_code,
  ee.name as external_employee_name,
  cg.id as company_group_id,
  cg.name as company_group_name
FROM employees e
LEFT JOIN employee_mappings em ON em.employee_id = e.id
LEFT JOIN external_employees ee ON ee.id = em.external_employee_id
LEFT JOIN companies c ON c.id = e.company_id
LEFT JOIN company_groups cg ON cg.id = c.company_group_id
WHERE LOWER(e.name) LIKE '%edecarlos%' 
   OR LOWER(e.name) LIKE '%lima%'
   OR LOWER(ee.name) LIKE '%edecarlos%'
   OR LOWER(ee.name) LIKE '%lima%'
ORDER BY e.name;

-- SEGUNDO: Após encontrar o external_employee_code, use esta query para buscar as vendas
-- Substitua 'SEU_EXTERNAL_EMPLOYEE_CODE' pelo código encontrado na query acima
-- Substitua 'SEU_GROUP_ID' pelo ID do grupo

SELECT 
  -- Estatísticas gerais
  COUNT(*) as total_registros,
  COUNT(DISTINCT sale_uuid) as vendas_distintas,
  COUNT(DISTINCT venda_id) as vendas_distintas_venda_id,
  SUM(total_value) as valor_total_vendas,
  SUM(quantity) as quantidade_total_itens,
  
  -- Datas
  MIN(sale_date) as primeira_venda,
  MAX(sale_date) as ultima_venda,
  
  -- Médias
  ROUND(SUM(total_value) / NULLIF(COUNT(DISTINCT sale_uuid), 0), 2) as ticket_medio_por_venda,
  ROUND(SUM(total_value) / NULLIF(SUM(quantity), 0), 2) as valor_medio_por_item
  
FROM external_sales
WHERE 
  company_group_id = 'SEU_GROUP_ID'  -- ⚠️ Substitua pelo ID do grupo
  AND external_employee_id = 'SEU_EXTERNAL_EMPLOYEE_CODE'  -- ⚠️ Substitua pelo código externo encontrado na query acima
  AND sale_date >= '2026-01-01'
  AND sale_date <= '2026-01-31'
  AND sale_uuid IS NOT NULL;

-- TERCEIRO: Query completa que busca automaticamente pelo nome (se houver apenas um resultado)
-- Esta query faz tudo de uma vez, mas só funciona se houver apenas um funcionário com esse nome

WITH funcionario_encontrado AS (
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
  -- Estatísticas gerais
  COUNT(*) as total_registros,
  COUNT(DISTINCT es.sale_uuid) as vendas_distintas,
  COUNT(DISTINCT es.venda_id) as vendas_distintas_venda_id,
  SUM(es.total_value) as valor_total_vendas,
  SUM(es.quantity) as quantidade_total_itens,
  
  -- Datas
  MIN(es.sale_date) as primeira_venda,
  MAX(es.sale_date) as ultima_venda,
  
  -- Médias
  ROUND(SUM(es.total_value) / NULLIF(COUNT(DISTINCT es.sale_uuid), 0), 2) as ticket_medio_por_venda,
  ROUND(SUM(es.total_value) / NULLIF(SUM(es.quantity), 0), 2) as valor_medio_por_item,
  
  -- Informações do funcionário
  fe.external_employee_code,
  fe.company_group_id
  
FROM external_sales es
CROSS JOIN funcionario_encontrado fe
WHERE 
  es.company_group_id = fe.company_group_id
  AND es.external_employee_id = fe.external_employee_code
  AND es.sale_date >= '2026-01-01'
  AND es.sale_date <= '2026-01-31'
  AND es.sale_uuid IS NOT NULL
GROUP BY fe.external_employee_code, fe.company_group_id;

-- QUARTA: Query simplificada - apenas valor total e quantidade de vendas
-- Use esta se já souber o external_employee_code e company_group_id

SELECT 
  SUM(total_value) as valor_total_vendas,
  COUNT(DISTINCT sale_uuid) as quantidade_vendas_distintas,
  SUM(quantity) as quantidade_total_itens
FROM external_sales
WHERE 
  company_group_id = 'SEU_GROUP_ID'  -- ⚠️ Substitua
  AND external_employee_id = 'SEU_EXTERNAL_EMPLOYEE_CODE'  -- ⚠️ Substitua
  AND sale_date >= '2026-01-01'
  AND sale_date <= '2026-01-31'
  AND sale_uuid IS NOT NULL;
