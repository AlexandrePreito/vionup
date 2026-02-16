-- Vendas por dia - Edecarlos (147-01) - Fev/2026
-- Dados do terminal: group_id=e48b81a9-97b5-4299-8cea-dce3ee919f5f, código=147-01

SELECT 
  sale_date as data,
  EXTRACT(DAY FROM sale_date)::int as dia,
  COUNT(DISTINCT sale_uuid) as vendas,
  ROUND(SUM(total_value)::numeric, 2) as faturamento
FROM external_sales
WHERE company_group_id = 'e48b81a9-97b5-4299-8cea-dce3ee919f5f'
  AND external_employee_id = '147-01'
  AND sale_date >= '2026-02-01'
  AND sale_date <= '2026-02-28'
  AND sale_uuid IS NOT NULL
GROUP BY sale_date
ORDER BY sale_date;
