-- Adicionar campo peso_unitario (kg) na tabela de vínculo estoque ↔ matéria-prima
ALTER TABLE raw_material_stock ADD COLUMN IF NOT EXISTS peso_unitario NUMERIC DEFAULT 1;

-- Comentário para documentação
COMMENT ON COLUMN raw_material_stock.peso_unitario IS 'Peso em kg de cada unidade/porção do estoque externo. Ex: 0.6 para porção de 600g. Estoque em kg = quantity * peso_unitario';
