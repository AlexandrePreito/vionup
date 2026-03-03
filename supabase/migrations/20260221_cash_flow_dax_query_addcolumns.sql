-- Migration: Corrigir query DAX do cash_flow para evitar multiplicação de linhas
--
-- PROBLEMA: SUMMARIZECOLUMNS com muitos campos (CodigoFuncionario, meio_nome, modo_venda, Periodo)
-- expande as linhas no Power BI, gerando valores inflados (ex: 167 registros viram 378).
--
-- SOLUÇÃO: Usar ADDCOLUMNS + SUMMARIZE para garantir UMA linha por idCaixa+Empresa+dt_contabil.
-- Os campos extras são puxados com FIRSTNONBLANK como atributos.
--
-- ⚠️ TESTE NO POWER BI (DAX Studio) ANTES DE APLICAR EM PRODUÇÃO!
-- Valide que retorna 167 registros para dia 24/02 empresa 01 (não 378).
--
-- Após aplicar:
-- 1. DELETE FROM external_cash_flow WHERE company_group_id = 'e48b81a9-97b5-4299-8cea-dce3ee919f5f';
-- 2. Resincronizar cash_flow

UPDATE powerbi_sync_configs
SET 
  dax_query = 'EVALUATE
ADDCOLUMNS(
    SUMMARIZE(
        CaixaItem,
        CaixaItem[idCaixa],
        CaixaItem[Empresa],
        CaixaItem[dt_contabil]
    ),
    "amount", [Caixa],
    "tipo", FIRSTNONBLANK(CaixaItem[tipo], 1),
    "meio_nome", FIRSTNONBLANK(CaixaItem[meio_nome], 1),
    "modo_venda", FIRSTNONBLANK(CaixaItem[modo_venda], 1),
    "CodigoFuncionario", FIRSTNONBLANK(CaixaItem[CodigoFuncionario], 1),
    "Periodo", FIRSTNONBLANK(CaixaItem[Periodo], 1)
)',
  updated_at = NOW()
WHERE entity_type = 'cash_flow';
