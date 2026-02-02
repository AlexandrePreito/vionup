-- =============================================
-- Tabela: categories (Categorias internas)
-- =============================================
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_group_id UUID NOT NULL REFERENCES company_groups(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),
  description TEXT,
  level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1 AND level <= 4),
  type VARCHAR(20) NOT NULL CHECK (type IN ('entrada', 'saida')),
  is_analytical BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_categories_company_group ON categories(company_group_id);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_level ON categories(level);
CREATE INDEX IF NOT EXISTS idx_categories_type ON categories(type);
CREATE INDEX IF NOT EXISTS idx_categories_is_analytical ON categories(is_analytical);

-- =============================================
-- Tabela: category_mappings (Mapeamentos de categorias)
-- =============================================
CREATE TABLE IF NOT EXISTS category_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_group_id UUID NOT NULL REFERENCES company_groups(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  external_category_id UUID NOT NULL REFERENCES external_categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Evitar mapeamentos duplicados
  UNIQUE(category_id, external_category_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_category_mappings_company_group ON category_mappings(company_group_id);
CREATE INDEX IF NOT EXISTS idx_category_mappings_category ON category_mappings(category_id);
CREATE INDEX IF NOT EXISTS idx_category_mappings_external ON category_mappings(external_category_id);

-- =============================================
-- Trigger para atualizar updated_at
-- =============================================
CREATE OR REPLACE FUNCTION update_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_categories_updated_at ON categories;
CREATE TRIGGER trigger_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION update_categories_updated_at();

-- =============================================
-- RLS (Row Level Security) - Opcional
-- =============================================
-- ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE category_mappings ENABLE ROW LEVEL SECURITY;

-- Políticas podem ser adicionadas conforme necessário
