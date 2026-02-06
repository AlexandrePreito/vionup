-- Query para verificar vendas de funcionário em fevereiro
-- Substitua os valores abaixo pelos seus dados reais

-- COMO ENCONTRAR O SEU_EMPLOYEE_CODE_AQUI:
-- Execute a query 0 abaixo para listar todos os funcionários e seus códigos externos
-- O campo "external_employee_code" é o que você precisa usar como SEU_EMPLOYEE_CODE_AQUI

-- 0. Listar todos os funcionários com seus códigos externos (execute esta primeiro!)
SELECT 
  e.id as employee_id,
  e.name as employee_name,
  e.code as employee_code,
  ee.external_id as external_employee_code,  -- ⭐ USE ESTE VALOR como SEU_EMPLOYEE_CODE_AQUI
  ee.name as external_employee_name,
  cg.id as company_group_id,
  cg.name as company_group_name
FROM employees e
LEFT JOIN employee_mappings em ON em.employee_id = e.id
LEFT JOIN external_employees ee ON ee.id = em.external_employee_id
LEFT JOIN companies c ON c.id = e.company_id
LEFT JOIN company_groups cg ON cg.id = c.company_group_id
WHERE cg.id = 'SEU_GROUP_ID_AQUI'  -- Substitua pelo ID do grupo
ORDER BY e.name;

-- 1. Verificar se há vendas para um funcionário específico em fevereiro 2026
SELECT 
  COUNT(*) as total_registros,
  COUNT(DISTINCT venda_id) as vendas_distintas,
  SUM(total_value) as faturamento_total,
  MIN(sale_date) as primeira_venda,
  MAX(sale_date) as ultima_venda
FROM external_sales
WHERE 
  company_group_id = 'SEU_GROUP_ID_AQUI'  -- Substitua pelo ID do grupo
  AND external_employee_id = 'SEU_EMPLOYEE_CODE_AQUI'  -- Use o external_id da tabela external_employees (veja query 3)
  AND sale_date >= '2026-02-01'
  AND sale_date <= '2026-02-28'
  AND venda_id IS NOT NULL
  AND venda_id != '';

-- 2. Verificar se a materialized view tem dados
SELECT 
  external_employee_id,
  year,
  month,
  total_revenue,
  total_quantity,
  total_sales
FROM mv_employee_sales_summary
WHERE 
  company_group_id = 'SEU_GROUP_ID_AQUI'
  AND external_employee_id = 'SEU_EMPLOYEE_CODE_AQUI'
  AND year = 2026
  AND month = 2;

-- 3. Verificar mapeamentos de funcionários
-- ⚠️ IMPORTANTE: O campo "external_employee_code" é o que você precisa usar como SEU_EMPLOYEE_CODE_AQUI
SELECT 
  e.id as employee_id,
  e.name as employee_name,
  em.external_employee_id as external_employee_uuid,
  ee.external_id as external_employee_code,  -- ⭐ USE ESTE VALOR como SEU_EMPLOYEE_CODE_AQUI
  ee.name as external_employee_name
FROM employees e
LEFT JOIN employee_mappings em ON em.employee_id = e.id
LEFT JOIN external_employees ee ON ee.id = em.external_employee_id
WHERE e.id = 'SEU_EMPLOYEE_ID_AQUI'  -- Substitua pelo ID do funcionário (você pode ver na URL da página)
ORDER BY e.name;

-- 4. Verificar todas as vendas de fevereiro (sem filtro de funcionário)
SELECT 
  external_employee_id,
  COUNT(*) as total_registros,
  COUNT(DISTINCT venda_id) as vendas_distintas,
  SUM(total_value) as faturamento_total
FROM external_sales
WHERE 
  company_group_id = 'SEU_GROUP_ID_AQUI'
  AND sale_date >= '2026-02-01'
  AND sale_date <= '2026-02-28'
  AND venda_id IS NOT NULL
  AND venda_id != ''
GROUP BY external_employee_id
ORDER BY faturamento_total DESC
LIMIT 20;
