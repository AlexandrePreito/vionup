-- Adicionar campo period nas tabelas external_sales e external_cash_flow
-- Este campo armazena o período da venda/caixa (ex: "Almoço", "Jantar", etc.)

-- Adicionar campo period na tabela external_sales
ALTER TABLE external_sales
ADD COLUMN IF NOT EXISTS period TEXT;

-- Adicionar campo period na tabela external_cash_flow
ALTER TABLE external_cash_flow
ADD COLUMN IF NOT EXISTS period TEXT;

-- Comentários para documentação
COMMENT ON COLUMN external_sales.period IS 'Período da venda (ex: Almoço, Jantar, etc.)';
COMMENT ON COLUMN external_cash_flow.period IS 'Período da transação (ex: Almoço, Jantar, etc.)';
