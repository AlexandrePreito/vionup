-- ============================================================
-- ATUALIZAR DAX DE EMPRESAS (Izu) - Trazer as 6 filiais
-- ============================================================
-- Problema: A tabela Empresa no Power BI tem só 4 linhas (1, 2, 6, 7).
-- Faltam 3=Jd Europa e 4=Jd Goiás Delivery.
--
-- Solução: UNION da tabela Empresa + DATATABLE com as 2 filiais faltantes.
-- O field_mapping espera: Codigo -> external_id, Filial -> name
-- ============================================================

-- 1. VER a config atual (antes de alterar)
SELECT 
  sc.id,
  pc.name as conexao,
  sc.dax_query,
  sc.field_mapping
FROM powerbi_sync_configs sc
JOIN powerbi_connections pc ON pc.id = sc.connection_id
WHERE sc.entity_type = 'companies'
  AND pc.company_group_id = '7da6530c-7fc9-4999-9e6c-b6d52cd4bbd3';  -- Izu

-- 2. ATUALIZAR a DAX para trazer as 6 filiais (UNION Empresa + faltantes)
-- Mantém Codigo e Filial para compatibilidade com o field_mapping atual
UPDATE powerbi_sync_configs sc
SET 
  dax_query = 'EVALUATE
VAR FromEmpresa = SELECTCOLUMNS(Empresa, "Codigo", Empresa[Codigo], "Filial", Empresa[Filial])
VAR Faltando = DATATABLE("Codigo", INTEGER, "Filial", STRING, {{3, "Jd Europa"}, {4, "Jd Goiás Delivery"}})
RETURN DISTINCT(UNION(FromEmpresa, Faltando))',
  updated_at = NOW()
FROM powerbi_connections pc
WHERE sc.connection_id = pc.id
  AND sc.entity_type = 'companies'
  AND pc.company_group_id = '7da6530c-7fc9-4999-9e6c-b6d52cd4bbd3';

-- 3. Conferir field_mapping: Codigo -> external_id, Filial -> name
