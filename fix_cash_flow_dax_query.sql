-- ============================================================
-- CORRIGIR QUERY DAX DO CAIXA - REMOVER COLUNA Periodo
-- ============================================================
-- 
-- O erro indica que a coluna 'Periodo' não existe na tabela CaixaItem
-- Vamos remover essa coluna da query DAX

-- PRIMEIRO: Verificar a query atual
SELECT 
  id,
  entity_type,
  dax_query,
  LEFT(dax_query, 200) as preview
FROM powerbi_sync_configs
WHERE entity_type = 'cash_flow';

-- SEGUNDO: Atualizar com query adaptável (inclui Periodo)
-- NOTA: O sistema agora detecta automaticamente se Periodo não existe e tenta sem ela
-- Mantenha Periodo na query - o sistema vai adaptar automaticamente se necessário
-- O nome da tabela pode ser 'Caixa' ou 'CaixaItem', ajuste conforme seu modelo

-- OPÇÃO 1: Se o nome da tabela for 'CaixaItem' (com 'Item')
UPDATE powerbi_sync_configs
SET dax_query = 'SUMMARIZECOLUMNS(
    CaixaItem[idCaixa],
    CaixaItem[CodigoFuncionario],
    CaixaItem[Empresa],
    CaixaItem[dt_contabil],
    CaixaItem[meio_nome],
    CaixaItem[tipo],
    CaixaItem[modo_venda],
    CaixaItem[Periodo],
    "valor", [Caixa]
)',
    updated_at = NOW()
WHERE entity_type = 'cash_flow';

-- OPÇÃO 2: Se o nome da tabela for 'Caixa' (sem 'Item'), descomente e use esta:
-- UPDATE powerbi_sync_configs
-- SET dax_query = 'SUMMARIZECOLUMNS(
--     Caixa[idCaixa],
--     Caixa[CodigoFuncionario],
--     Caixa[Empresa],
--     Caixa[dt_contabil],
--     Caixa[meio_nome],
--     Caixa[tipo],
--     Caixa[modo_venda],
--     Caixa[Periodo],
--     "valor", [Caixa]
-- )',
--     updated_at = NOW()
-- WHERE entity_type = 'cash_flow';

-- TERCEIRO: Verificar se foi atualizado
SELECT 
  id,
  entity_type,
  dax_query,
  updated_at
FROM powerbi_sync_configs
WHERE entity_type = 'cash_flow';
