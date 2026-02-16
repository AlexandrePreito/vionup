-- ============================================================
-- PADRONIZAR QUERY DAX DE VENDAS (Aquarius + Izu)
-- ============================================================
-- Query padrão com idVenda, venda_id e Periodo para evitar duplicatas
-- O filtro de data é injetado automaticamente pelo sistema
--
-- ⚠️ ATENÇÃO: Se o modelo Izu não tiver as colunas Periodo ou venda_id,
-- a sincronização vai falhar. Nesse caso, adicione essas colunas ao
-- modelo Power BI do Izu antes de rodar o UPDATE.

-- 1. VER como estão as queries atuais
SELECT 
  sc.id,
  pc.name as conexao,
  cg.name as grupo,
  sc.entity_type,
  LEFT(sc.dax_query, 300) as preview
FROM powerbi_sync_configs sc
JOIN powerbi_connections pc ON pc.id = sc.connection_id
JOIN company_groups cg ON cg.id = pc.company_group_id
WHERE sc.entity_type = 'sales';

-- 2. ATUALIZAR todas as configs de vendas para a query padrão
UPDATE powerbi_sync_configs
SET 
  dax_query = 'FILTER(
  SUMMARIZECOLUMNS(
    VendaItemGeral[Empresa],
    VendaItemGeral[idVenda],
    VendaItemGeral[dt_contabil],
    VendaItemGeral[CodigoMaterial],
    VendaItemGeral[modo_venda_descr],
    VendaItemGeral[CodigoFuncionario],
    VendaItemGeral[Periodo],
    VendaItemGeral[venda_id],
    "cost", [CMV],
    "quantity", [Quantidades],
    "total_value", [Vendas Valor]
  ),
  NOT ISBLANK([quantity])
)',
  updated_at = NOW()
WHERE entity_type = 'sales';

-- 3. CONFERIR resultado
SELECT 
  pc.name as conexao,
  cg.name as grupo,
  sc.dax_query,
  sc.updated_at
FROM powerbi_sync_configs sc
JOIN powerbi_connections pc ON pc.id = sc.connection_id
LEFT JOIN company_groups cg ON cg.id = pc.company_group_id
WHERE sc.entity_type = 'sales';
