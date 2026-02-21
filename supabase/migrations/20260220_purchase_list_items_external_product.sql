-- Itens de lista de compra podem ser matéria-prima (MP) ou produto revenda.
-- MP: raw_material_id preenchido (UUID).
-- Revenda: external_product_id preenchido (código ex: 101009-01).

ALTER TABLE purchase_list_items
  ADD COLUMN IF NOT EXISTS external_product_id TEXT NULL;

ALTER TABLE purchase_list_items
  ALTER COLUMN raw_material_id DROP NOT NULL;

-- Pelo menos um dos dois deve estar preenchido
ALTER TABLE purchase_list_items
  ADD CONSTRAINT chk_item_origin CHECK (
    (raw_material_id IS NOT NULL AND external_product_id IS NULL)
    OR (raw_material_id IS NULL AND external_product_id IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS idx_purchase_list_items_external_product
  ON purchase_list_items(external_product_id) WHERE external_product_id IS NOT NULL;
