-- Tabela: Turnos
CREATE TABLE IF NOT EXISTS shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_group_id UUID NOT NULL REFERENCES company_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  start_time TIME,
  end_time TIME,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Código único dentro do mesmo grupo
  UNIQUE(company_group_id, code)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_shifts_group_id ON shifts(company_group_id);
CREATE INDEX IF NOT EXISTS idx_shifts_code ON shifts(code);
CREATE INDEX IF NOT EXISTS idx_shifts_is_active ON shifts(is_active);

-- Trigger para updated_at
CREATE TRIGGER trigger_shifts_updated_at
  BEFORE UPDATE ON shifts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "shifts_select" ON shifts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() 
      AND (u.role = 'master' OR u.company_group_id = shifts.company_group_id)
    )
  );

CREATE POLICY "shifts_insert" ON shifts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() 
      AND (u.role = 'master' OR (u.role IN ('group_admin', 'company_admin') AND u.company_group_id = shifts.company_group_id))
    )
  );

CREATE POLICY "shifts_update" ON shifts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() 
      AND (u.role = 'master' OR (u.role IN ('group_admin', 'company_admin') AND u.company_group_id = shifts.company_group_id))
    )
  );

CREATE POLICY "shifts_delete" ON shifts
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.auth_id = auth.uid() 
      AND (u.role = 'master' OR (u.role = 'group_admin' AND u.company_group_id = shifts.company_group_id))
    )
  );

-- Comentários
COMMENT ON TABLE shifts IS 'Turnos de trabalho para controle de metas';
COMMENT ON COLUMN shifts.company_group_id IS 'Grupo ao qual o turno pertence';
COMMENT ON COLUMN shifts.code IS 'Código do turno';
COMMENT ON COLUMN shifts.start_time IS 'Horário de início do turno';
COMMENT ON COLUMN shifts.end_time IS 'Horário de término do turno';
