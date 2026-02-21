-- Tabela: Projeções salvas (previsão de vendas)
-- Permite salvar cenários e comparar com o realizado ao longo do tempo
CREATE TABLE IF NOT EXISTS saved_projections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_group_id UUID NOT NULL REFERENCES company_groups(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,

  -- Cenários salvos (valor acumulado final projetado)
  cenario_otimista NUMERIC NOT NULL DEFAULT 0,
  cenario_realista NUMERIC NOT NULL DEFAULT 0,
  cenario_pessimista NUMERIC NOT NULL DEFAULT 0,

  -- Meta da empresa no momento do save
  meta_empresa NUMERIC NOT NULL DEFAULT 0,

  -- Realizado até o momento do save
  realizado_no_save NUMERIC NOT NULL DEFAULT 0,
  dias_passados_no_save INTEGER NOT NULL DEFAULT 0,

  -- Projeção dia a dia (JSONB com array de objetos)
  -- Formato: [{ "dia": 1, "data": "2026-02-01", "realizado": 5000, "otimista": null, "realista": null, "pessimista": null }, ...]
  projecao_diaria JSONB NOT NULL DEFAULT '[]',

  -- Metadados
  saved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  saved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index para busca rápida
CREATE INDEX IF NOT EXISTS idx_saved_projections_lookup
  ON saved_projections(company_group_id, company_id, year, month, is_active);

CREATE INDEX IF NOT EXISTS idx_saved_projections_saved_at
  ON saved_projections(saved_at DESC);

COMMENT ON TABLE saved_projections IS 'Projeções de previsão de vendas salvas para acompanhamento vs realizado';
