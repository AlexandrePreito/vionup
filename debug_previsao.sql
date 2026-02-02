-- SQL para debugar valores de previsão - JD da Luz Janeiro 2026
-- Execute esta query completa que faz tudo automaticamente

WITH empresa_interna AS (
  SELECT id, name, company_group_id 
  FROM companies 
  WHERE name ILIKE '%JD da Luz%' OR name ILIKE '%jd da luz%'
  LIMIT 1
),
mapeamentos AS (
  SELECT 
    cm.external_company_id,
    ec.external_id as codigo_externo,
    ec.name as nome_externo
  FROM company_mappings cm
  JOIN external_companies ec ON ec.id = cm.external_company_id
  JOIN empresa_interna ei ON ei.id = cm.company_id AND ei.company_group_id = cm.company_group_id
)
SELECT 
  ei.name as empresa_interna,
  STRING_AGG(DISTINCT m.codigo_externo, ', ') as codigos_externos,
  STRING_AGG(DISTINCT m.nome_externo, ', ') as nomes_externos,
  SUM(cf.amount) as total_realizado,
  COUNT(*) as total_registros,
  COUNT(DISTINCT cf.transaction_date) as dias_com_vendas,
  MIN(cf.transaction_date) as primeira_data,
  MAX(cf.transaction_date) as ultima_data,
  AVG(cf.amount) as media_por_registro
FROM external_cash_flow cf
JOIN mapeamentos m ON m.codigo_externo = cf.external_company_id
JOIN empresa_interna ei ON ei.company_group_id = cf.company_group_id
WHERE cf.transaction_date >= '2026-01-01'
  AND cf.transaction_date <= '2026-01-31'
GROUP BY ei.name;

-- Query alternativa: Total por dia
WITH empresa_interna AS (
  SELECT id, name, company_group_id 
  FROM companies 
  WHERE name ILIKE '%JD da Luz%' OR name ILIKE '%jd da luz%'
  LIMIT 1
),
mapeamentos AS (
  SELECT 
    cm.external_company_id,
    ec.external_id as codigo_externo
  FROM company_mappings cm
  JOIN external_companies ec ON ec.id = cm.external_company_id
  JOIN empresa_interna ei ON ei.id = cm.company_id AND ei.company_group_id = cm.company_group_id
)
SELECT 
  cf.transaction_date,
  SUM(cf.amount) as total_dia,
  COUNT(*) as registros_dia
FROM external_cash_flow cf
JOIN mapeamentos m ON m.codigo_externo = cf.external_company_id
JOIN empresa_interna ei ON ei.company_group_id = cf.company_group_id
WHERE cf.transaction_date >= '2026-01-01'
  AND cf.transaction_date <= '2026-01-31'
GROUP BY cf.transaction_date
ORDER BY cf.transaction_date;
