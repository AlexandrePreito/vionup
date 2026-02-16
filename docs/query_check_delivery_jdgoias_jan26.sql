-- ============================================================
-- Verificar vendas de DELIVERY em jan/2026 - Jd Goiás (Izu)
-- ============================================================
-- Grupo Izu: 7da6530c-7fc9-4999-9e6c-b6d52cd4bbd3
-- Jd Goiás = external_id '1'
-- ============================================================

-- 1. Total de registros em external_cash_flow para Jd Goiás em jan/26
SELECT 
  external_company_id,
  COUNT(*) as total_registros,
  SUM(amount) as total_valor
FROM external_cash_flow
WHERE company_group_id = '7da6530c-7fc9-4999-9e6c-b6d52cd4bbd3'
  AND external_company_id = '1'
  AND transaction_date >= '2026-01-01'
  AND transaction_date <= '2026-01-31'
GROUP BY external_company_id;

-- 2. Valores distintos de transaction_mode para Jd Goiás em jan/26
SELECT 
  transaction_mode,
  COUNT(*) as qtd,
  SUM(amount) as total_valor
FROM external_cash_flow
WHERE company_group_id = '7da6530c-7fc9-4999-9e6c-b6d52cd4bbd3'
  AND external_company_id = '1'
  AND transaction_date >= '2026-01-01'
  AND transaction_date <= '2026-01-31'
GROUP BY transaction_mode
ORDER BY total_valor DESC;

-- 3. Especificamente: existe ALGUM registro com modo "entrega"?
SELECT 
  COUNT(*) as qtd_delivery,
  COALESCE(SUM(amount), 0) as valor_delivery
FROM external_cash_flow
WHERE company_group_id = '7da6530c-7fc9-4999-9e6c-b6d52cd4bbd3'
  AND external_company_id = '1'
  AND transaction_date >= '2026-01-01'
  AND transaction_date <= '2026-01-31'
  AND LOWER(TRIM(transaction_mode)) = 'entrega';

-- 4. Amostra de 5 registros cash_flow (qualquer modo) para ver estrutura
SELECT 
  transaction_date,
  transaction_mode,
  amount,
  period
FROM external_cash_flow
WHERE company_group_id = '7da6530c-7fc9-4999-9e6c-b6d52cd4bbd3'
  AND external_company_id = '1'
  AND transaction_date >= '2026-01-01'
  AND transaction_date <= '2026-01-31'
ORDER BY transaction_date DESC
LIMIT 5;

-- ============================================================
-- EXTERNAL_SALES (VendaItemGeral) - fonte alternativa para modo
-- ============================================================
-- 5. Valores distintos de sale_mode em external_sales para 1 e 4 em jan/26
SELECT 
  sale_mode,
  COUNT(*) as qtd_linhas,
  COUNT(DISTINCT venda_id) as vendas_distintas,
  SUM(total_value) as total_valor
FROM external_sales
WHERE company_group_id = '7da6530c-7fc9-4999-9e6c-b6d52cd4bbd3'
  AND external_company_id IN ('1', '4')
  AND sale_date >= '2026-01-01'
  AND sale_date <= '2026-01-31'
GROUP BY sale_mode
ORDER BY total_valor DESC;

-- 6. Total vendas distintas (comparar com count_distinct_sales)
SELECT COUNT(DISTINCT venda_id) as vendas_distintas_venda_id,
       COUNT(DISTINCT COALESCE(sale_uuid, venda_id)) as vendas_distintas_uuid_ou_id
FROM external_sales
WHERE company_group_id = '7da6530c-7fc9-4999-9e6c-b6d52cd4bbd3'
  AND external_company_id IN ('1', '4')
  AND sale_date >= '2026-01-01'
  AND sale_date <= '2026-01-31'
  AND (venda_id IS NOT NULL AND venda_id != '' OR sale_uuid IS NOT NULL AND sale_uuid != '');

-- 7. Amostra sale_mode em external_sales (valores crus)
SELECT DISTINCT sale_mode, COUNT(*) as qtd
FROM external_sales
WHERE company_group_id = '7da6530c-7fc9-4999-9e6c-b6d52cd4bbd3'
  AND external_company_id IN ('1', '4')
  AND sale_date >= '2026-01-01'
  AND sale_date <= '2026-01-31'
GROUP BY sale_mode
ORDER BY qtd DESC;

-- ============================================================
-- DIAGNÓSTICO: modo_venda_descr no Power BI
-- ============================================================
-- Se sale_mode = só "mesa", a sync de vendas pode estar:
-- 1. Com field_mapping errado (modo_venda_descr não mapeado para sale_mode)
-- 2. Ou modo_venda_descr no Power BI só tem "Mesa" (sem "Entrega")
-- Verificar na config de sync de vendas (Izu) se field_mapping tem:
--   "modo_venda_descr" -> "sale_mode" ou "VendaItemGeral[modo_venda_descr]" -> "sale_mode"
