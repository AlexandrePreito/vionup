-- Query completa para verificar external_cash_flow por transaction_mode
-- Novembro 2025, Grupo IZU (tudo em uma query)

WITH grupo_izu AS (
  SELECT id 
  FROM company_groups 
  WHERE slug = 'izu' OR name ILIKE '%izu%'
  LIMIT 1
)
SELECT 
  cf.transaction_mode,
  COUNT(*) as total_transactions,
  SUM(cf.amount) as total_amount,
  ROUND(AVG(cf.amount), 2) as avg_amount,
  MIN(cf.transaction_date) as primeira_data,
  MAX(cf.transaction_date) as ultima_data
FROM external_cash_flow cf
CROSS JOIN grupo_izu g
WHERE cf.company_group_id = g.id
  AND cf.transaction_date >= '2025-11-01'
  AND cf.transaction_date < '2025-12-01'
GROUP BY cf.transaction_mode
ORDER BY total_amount DESC;

-- Query para ver exemplos de registros
WITH grupo_izu AS (
  SELECT id 
  FROM company_groups 
  WHERE slug = 'izu' OR name ILIKE '%izu%'
  LIMIT 1
)
SELECT 
  cf.transaction_date,
  cf.external_company_id,
  cf.transaction_mode,
  cf.period,
  cf.amount
FROM external_cash_flow cf
CROSS JOIN grupo_izu g
WHERE cf.company_group_id = g.id
  AND cf.transaction_date >= '2025-11-01'
  AND cf.transaction_date < '2025-12-01'
ORDER BY cf.transaction_date DESC
LIMIT 100;

-- Query para ver valores distintos de transaction_mode e period
WITH grupo_izu AS (
  SELECT id 
  FROM company_groups 
  WHERE slug = 'izu' OR name ILIKE '%izu%'
  LIMIT 1
)
SELECT DISTINCT 
  cf.transaction_mode,
  cf.period,
  COUNT(*) as quantidade
FROM external_cash_flow cf
CROSS JOIN grupo_izu g
WHERE cf.company_group_id = g.id
  AND cf.transaction_date >= '2025-11-01'
  AND cf.transaction_date < '2025-12-01'
GROUP BY cf.transaction_mode, cf.period
ORDER BY cf.transaction_mode, cf.period;
