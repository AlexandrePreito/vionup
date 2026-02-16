-- ============================================================
-- SQL URGENTE — Bug de Data na Sincronização
-- Rodar no Supabase SQL Editor AGORA
-- ============================================================
-- Causa raiz: initial_date salva com ano errado (ex: 0206-11-14 em vez de 2006-11-14)
-- Isso gera ~664.748 dias de processamento e trava a fila
-- ============================================================

-- 1. Cancelar itens travados com total_days absurdo
UPDATE sync_queue 
SET status = 'cancelled', 
    finished_at = NOW(),
    updated_at = NOW(),
    error_message = 'Cancelado - bug de data (ano 0206 em vez de 2006)'
WHERE status IN ('pending', 'processing') 
  AND total_days > 1095;

-- 2. Verificar qual config tem initial_date errada
SELECT id, entity_type, initial_date, date_field 
FROM powerbi_sync_configs 
WHERE initial_date IS NOT NULL
ORDER BY initial_date;

-- 3. Se encontrar datas com ano < 2000, corrigir (exemplo):
-- UPDATE powerbi_sync_configs 
-- SET initial_date = '2006-11-14' 
-- WHERE initial_date = '0206-11-14';
-- (Descomente e ajuste conforme o resultado do SELECT acima)
