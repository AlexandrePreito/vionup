-- =============================================
-- LISTAS DE COMPRA - Criar tabelas
-- =============================================

-- Tabela principal: cabeçalho da lista
CREATE TABLE purchase_lists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_group_id UUID NOT NULL REFERENCES company_groups(id),
  company_id UUID REFERENCES companies(id),
  name TEXT NOT NULL,
  target_date DATE NOT NULL,
  status TEXT DEFAULT 'rascunho',
  projection_days INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de itens da lista
CREATE TABLE purchase_list_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_list_id UUID NOT NULL REFERENCES purchase_lists(id) ON DELETE CASCADE,
  raw_material_id UUID NOT NULL REFERENCES raw_materials(id),
  raw_material_name TEXT NOT NULL,
  parent_name TEXT,
  unit TEXT DEFAULT 'kg',
  projected_quantity NUMERIC DEFAULT 0,
  adjusted_quantity NUMERIC DEFAULT 0,
  current_stock NUMERIC DEFAULT 0,
  min_stock NUMERIC DEFAULT 0,
  loss_factor NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_purchase_lists_group ON purchase_lists(company_group_id);
CREATE INDEX idx_purchase_lists_date ON purchase_lists(target_date);
CREATE INDEX idx_purchase_list_items_list ON purchase_list_items(purchase_list_id);

-- RLS
ALTER TABLE purchase_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_list_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "purchase_lists_all" ON purchase_lists FOR ALL USING (true);
CREATE POLICY "purchase_list_items_all" ON purchase_list_items FOR ALL USING (true);
