-- ============================================================
-- DIAGNÓSTICO: Empresas - Power BI vs Banco
-- ============================================================
-- Power BI Izu tem: 1=Jd Goiás, 2=Delivery, 3=Jd Europa, 4=Jd Goiás Delivery, 6=Oeste, 7=El Dorado
-- Banco deveria ter as 6. Se faltam 3 e 4, a sync pode estar retornando só empresas com vendas.

-- 1. Ver empresas em external_companies (Izu)
SELECT 
  external_id as codigo,
  name as filial,
  company_group_id
FROM external_companies
WHERE company_group_id = '7da6530c-7fc9-4999-9e6c-b6d52cd4bbd3'  -- Izu
ORDER BY external_id;

-- 2. Ver config de sync de empresas (TODAS as conexões)
SELECT 
  sc.id,
  pc.name as conexao,
  pc.company_group_id,
  cg.name as grupo,
  sc.entity_type,
  sc.dataset_id,
  LEFT(sc.dax_query, 500) as dax_preview,
  sc.field_mapping
FROM powerbi_sync_configs sc
JOIN powerbi_connections pc ON pc.id = sc.connection_id
LEFT JOIN company_groups cg ON cg.id = pc.company_group_id
WHERE sc.entity_type = 'companies';

-- 2b. Izu especificamente tem config de empresas?
SELECT 
  pc.name,
  cg.name as grupo,
  sc.id as config_id,
  CASE WHEN sc.id IS NOT NULL THEN 'SIM' ELSE 'NÃO' END as tem_config_empresas
FROM powerbi_connections pc
LEFT JOIN company_groups cg ON cg.id = pc.company_group_id
LEFT JOIN powerbi_sync_configs sc ON sc.connection_id = pc.id AND sc.entity_type = 'companies'
WHERE cg.name ILIKE '%izu%' OR pc.name ILIKE '%izu%';

-- 3. CORREÇÃO RÁPIDA: Inserir as 2 filiais faltantes manualmente
-- Execute se a sync não conseguir trazer Jd Europa (3) e Jd Goiás Delivery (4)
/*
INSERT INTO external_companies (company_group_id, external_id, name)
VALUES 
  ('7da6530c-7fc9-4999-9e6c-b6d52cd4bbd3', '3', 'Jd Europa'),
  ('7da6530c-7fc9-4999-9e6c-b6d52cd4bbd3', '4', 'Jd Goiás Delivery')
ON CONFLICT (company_group_id, external_id) DO UPDATE SET name = EXCLUDED.name;
*/

-- 4. Se a DAX de empresas usar SUMMARIZE(VendaItemGeral, Empresa), ela só retorna
--    empresas que TÊM vendas. Filiais 3 e 4 podem não ter vendas no período do dataset.
--    Solução: usar tabela de DIMENSÃO (ex: DimEmpresa) no Power BI, se existir:
--    EVALUATE SUMMARIZE(DimEmpresa, DimEmpresa[Id], DimEmpresa[Nome])
