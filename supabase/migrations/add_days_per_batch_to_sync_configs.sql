-- Adicionar coluna days_per_batch na tabela powerbi_sync_configs
ALTER TABLE powerbi_sync_configs 
ADD COLUMN IF NOT EXISTS days_per_batch INTEGER DEFAULT 7;
