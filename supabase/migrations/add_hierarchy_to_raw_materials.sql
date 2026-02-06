-- Adicionar campos de hierarquia à tabela raw_materials
ALTER TABLE raw_materials
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES raw_materials(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS level INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS gramatura INTEGER;

-- Criar índice para melhorar performance de consultas hierárquicas
CREATE INDEX IF NOT EXISTS idx_raw_materials_parent_id ON raw_materials(parent_id);
CREATE INDEX IF NOT EXISTS idx_raw_materials_level ON raw_materials(level);

-- Atualizar level baseado em parent_id existente (se houver)
-- Primeiro, definir todos como level 1
UPDATE raw_materials SET level = 1 WHERE level IS NULL OR level = 0;

-- Função para calcular level recursivamente (será usado em triggers futuros)
CREATE OR REPLACE FUNCTION calculate_raw_material_level(parent_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
  IF parent_uuid IS NULL THEN
    RETURN 1;
  ELSE
    RETURN (
      SELECT COALESCE(level, 1) + 1
      FROM raw_materials
      WHERE id = parent_uuid
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar level automaticamente quando parent_id mudar
CREATE OR REPLACE FUNCTION update_raw_material_level()
RETURNS TRIGGER AS $$
BEGIN
  NEW.level = calculate_raw_material_level(NEW.parent_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_raw_material_level ON raw_materials;
CREATE TRIGGER trigger_update_raw_material_level
  BEFORE INSERT OR UPDATE OF parent_id ON raw_materials
  FOR EACH ROW
  EXECUTE FUNCTION update_raw_material_level();

-- Comentários
COMMENT ON COLUMN raw_materials.parent_id IS 'ID da matéria-prima pai na hierarquia';
COMMENT ON COLUMN raw_materials.level IS 'Nível na hierarquia (1 = raiz, 2 = filho, 3 = neto)';
COMMENT ON COLUMN raw_materials.gramatura IS 'Gramatura em gramas (apenas nível 3)';
