-- Adicionar campo venda_id na tabela external_sales
-- Este campo armazena o ID da venda do sistema externo (Power BI)

-- Adicionar campo venda_id na tabela external_sales
ALTER TABLE external_sales
ADD COLUMN IF NOT EXISTS venda_id TEXT;

-- Comentário para documentação
COMMENT ON COLUMN external_sales.venda_id IS 'ID da venda do sistema externo (Power BI)';
