-- ============================================================
-- ATUALIZAR QUERY DAX PARA CONFIGURAÇÃO DE CAIXA
-- ============================================================
-- 
-- INSTRUÇÕES:
-- 1. Execute este script no Supabase SQL Editor
-- 2. Substitua 'SEU_CONFIG_ID' pelo ID da configuração de caixa
-- 3. Ou use a query abaixo para encontrar o config_id primeiro
--
-- Para encontrar o config_id:
-- SELECT id, entity_type, name, connection_id 
-- FROM powerbi_sync_configs 
-- WHERE entity_type = 'cash_flow';

-- ============================================================
-- OPÇÃO 1: Atualizar por config_id específico
-- ============================================================
UPDATE powerbi_sync_configs
SET dax_query = 'SUMMARIZECOLUMNS(
    Caixa[idCaixa],
    Caixa[CodigoFuncionario],
    Caixa[Empresa],
    Caixa[dt_contabil],
    Caixa[meio_nome],
    Caixa[tipo],
    Caixa[modo_venda],
    Caixa[Periodo],
    "valor", [Caixa]
)',
    updated_at = NOW()
WHERE id = 'SEU_CONFIG_ID_AQUI'  -- ⚠️ Substitua pelo ID real
  AND entity_type = 'cash_flow';

-- ============================================================
-- OPÇÃO 2: Atualizar todas as configurações de caixa de uma conexão
-- ============================================================
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
-- WHERE connection_id = 'SEU_CONNECTION_ID_AQUI'  -- ⚠️ Substitua pelo ID da conexão
--   AND entity_type = 'cash_flow';

-- ============================================================
-- VERIFICAR RESULTADO
-- ============================================================
-- SELECT 
--     id,
--     entity_type,
--     dax_query,
--     updated_at
-- FROM powerbi_sync_configs
-- WHERE entity_type = 'cash_flow';
