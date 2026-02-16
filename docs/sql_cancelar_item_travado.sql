-- ============================================================
-- CANCELAR ITEM TRAVADO - Bug de data (ano 0206, total_days absurdo)
-- Rodar no Supabase SQL Editor IMEDIATAMENTE
-- ============================================================

-- Cancelar o item que está processando com datas erradas
UPDATE sync_queue 
SET status = 'cancelled', 
    finished_at = NOW(),
    updated_at = NOW(),
    error_message = 'Cancelado - bug de data (ano 0206 em vez de 2006, total_days=664748)'
WHERE status IN ('pending', 'processing') 
  AND total_days > 1095;

-- Verificar se cancelou
-- SELECT id, status, start_date, end_date, total_days, error_message 
-- FROM sync_queue 
-- WHERE status IN ('pending', 'processing');
