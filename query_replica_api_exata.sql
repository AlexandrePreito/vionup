-- Query que replica EXATAMENTE o que a API faz
-- Use esta para comparar com os valores retornados pela API

-- Dados do funcionário (dos logs):
-- employee_id: 21312a1e-d7d7-4b6a-ae5c-94db86ca5cba
-- external_employee_code: 147-01
-- company_group_id: e48b81a9-97b5-4299-8cea-dce3ee919f5f
-- Período: Janeiro 2026 (year: 2026, month: 1)

SELECT 
  -- Exatamente como a API calcula
  COUNT(*) as total_registros_encontrados,
  COUNT(DISTINCT sale_uuid) as quantidade_vendas_distintas,
  SUM(total_value) as valor_total_vendas,
  ROUND(SUM(total_value) / NULLIF(COUNT(DISTINCT sale_uuid), 0), 2) as ticket_medio,
  
  -- Informações adicionais para debug
  MIN(sale_date) as primeira_venda,
  MAX(sale_date) as ultima_venda,
  
  -- Verificar se há registros com sale_uuid NULL (que a API filtra)
  COUNT(*) FILTER (WHERE sale_uuid IS NULL) as registros_com_sale_uuid_null,
  COUNT(*) FILTER (WHERE sale_uuid IS NOT NULL) as registros_com_sale_uuid
  
FROM external_sales
WHERE 
  company_group_id = 'e48b81a9-97b5-4299-8cea-dce3ee919f5f'
  AND external_employee_id = '147-01'
  AND sale_date >= '2026-01-01'
  AND sale_date <= '2026-01-31'
  AND sale_uuid IS NOT NULL;  -- A API filtra por este campo

-- ============================================================
-- QUERY PARA VERIFICAR SE HÁ DADOS DE FEVEREIRO (month: 2)
-- ============================================================
-- A API pode estar buscando fevereiro em vez de janeiro

SELECT 
  'Janeiro 2026' as periodo,
  COUNT(DISTINCT sale_uuid) as vendas_distintas,
  SUM(total_value) as valor_total
FROM external_sales
WHERE 
  company_group_id = 'e48b81a9-97b5-4299-8cea-dce3ee919f5f'
  AND external_employee_id = '147-01'
  AND sale_date >= '2026-01-01'
  AND sale_date <= '2026-01-31'
  AND sale_uuid IS NOT NULL

UNION ALL

SELECT 
  'Fevereiro 2026' as periodo,
  COUNT(DISTINCT sale_uuid) as vendas_distintas,
  SUM(total_value) as valor_total
FROM external_sales
WHERE 
  company_group_id = 'e48b81a9-97b5-4299-8cea-dce3ee919f5f'
  AND external_employee_id = '147-01'
  AND sale_date >= '2026-02-01'
  AND sale_date <= '2026-02-28'
  AND sale_uuid IS NOT NULL;

-- ============================================================
-- QUERY PARA VERIFICAR TODOS OS MESES DE 2026
-- ============================================================

SELECT 
  EXTRACT(MONTH FROM sale_date) as mes,
  COUNT(DISTINCT sale_uuid) as vendas_distintas,
  SUM(total_value) as valor_total
FROM external_sales
WHERE 
  company_group_id = 'e48b81a9-97b5-4299-8cea-dce3ee919f5f'
  AND external_employee_id = '147-01'
  AND sale_date >= '2026-01-01'
  AND sale_date <= '2026-12-31'
  AND sale_uuid IS NOT NULL
GROUP BY EXTRACT(MONTH FROM sale_date)
ORDER BY EXTRACT(MONTH FROM sale_date);
