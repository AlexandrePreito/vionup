-- Script para truncar tabelas de entidades de fato
-- Execute este script no Supabase SQL Editor

TRUNCATE TABLE external_sales;
TRUNCATE TABLE external_cash_flow;
TRUNCATE TABLE external_cash_flow_statement;

-- Verificar que as tabelas foram limpas
SELECT 
  'external_sales' as tabela,
  COUNT(*) as registros
FROM external_sales
UNION ALL
SELECT 
  'external_cash_flow' as tabela,
  COUNT(*) as registros
FROM external_cash_flow
UNION ALL
SELECT 
  'external_cash_flow_statement' as tabela,
  COUNT(*) as registros
FROM external_cash_flow_statement;
