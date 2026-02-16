-- Preencher sale_uuid com venda_id onde sale_uuid está NULL
-- A API de dashboard filtra por sale_uuid; sync popula venda_id
-- Esta migração corrige dados existentes

-- Adicionar coluna sale_uuid se não existir (alguns ambientes usam apenas venda_id)
ALTER TABLE external_sales ADD COLUMN IF NOT EXISTS sale_uuid TEXT;

-- Backfill: preencher sale_uuid com venda_id onde sale_uuid está vazio
UPDATE external_sales
SET sale_uuid = venda_id
WHERE venda_id IS NOT NULL
  AND venda_id != ''
  AND (sale_uuid IS NULL OR sale_uuid = '');
