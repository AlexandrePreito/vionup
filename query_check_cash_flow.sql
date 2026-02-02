-- Query para verificar external_cash_flow por transaction_mode
-- Novembro 2025, Grupo IZU

-- Primeiro, encontrar o ID do grupo "izu"
SELECT id, name, slug 
FROM company_groups 
WHERE slug = 'izu' OR name ILIKE '%izu%';

-- Depois, usar o ID do grupo para ver os dados de cash flow
-- Substitua 'GROUP_ID_AQUI' pelo ID retornado acima

-- Ver dados agrupados por transaction_mode
SELECT 
  transaction_mode,
  COUNT(*) as total_transactions,
  SUM(amount) as total_amount,
  AVG(amount) as avg_amount
FROM external_cash_flow
WHERE company_group_id = 'GROUP_ID_AQUI'  -- Substitua pelo ID do grupo
  AND transaction_date >= '2025-11-01'
  AND transaction_date < '2025-12-01'
GROUP BY transaction_mode
ORDER BY total_amount DESC;

-- Ver alguns exemplos de registros
SELECT 
  transaction_date,
  external_company_id,
  transaction_mode,
  period,
  amount
FROM external_cash_flow
WHERE company_group_id = 'GROUP_ID_AQUI'  -- Substitua pelo ID do grupo
  AND transaction_date >= '2025-11-01'
  AND transaction_date < '2025-12-01'
ORDER BY transaction_date DESC
LIMIT 50;

-- Ver valores distintos de transaction_mode
SELECT DISTINCT transaction_mode
FROM external_cash_flow
WHERE company_group_id = 'GROUP_ID_AQUI'  -- Substitua pelo ID do grupo
  AND transaction_date >= '2025-11-01'
  AND transaction_date < '2025-12-01'
ORDER BY transaction_mode;
