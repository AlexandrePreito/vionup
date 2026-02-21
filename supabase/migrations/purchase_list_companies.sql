-- Tabela de relacionamento: lista de compra <-> filiais (N:N)
-- Lista sem linhas = "Todas as filiais"; com linhas = apenas as filiais selecionadas
CREATE TABLE IF NOT EXISTS purchase_list_companies (
  purchase_list_id UUID NOT NULL REFERENCES purchase_lists(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  PRIMARY KEY (purchase_list_id, company_id)
);

CREATE INDEX IF NOT EXISTS idx_purchase_list_companies_company_id ON purchase_list_companies(company_id);

-- Comentário: para listas já existentes que têm company_id preenchido em purchase_lists,
-- você pode migrar com:
-- INSERT INTO purchase_list_companies (purchase_list_id, company_id)
-- SELECT id, company_id FROM purchase_lists WHERE company_id IS NOT NULL
-- ON CONFLICT (purchase_list_id, company_id) DO NOTHING;
