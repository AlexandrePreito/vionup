-- Migration: Adicionar campos de confirmação de uso nas perguntas NPS
-- Execute este script no Supabase SQL Editor

-- 1. Adicionar campos na tabela nps_perguntas
ALTER TABLE nps_perguntas 
ADD COLUMN IF NOT EXISTS requer_confirmacao_uso BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS texto_confirmacao_uso TEXT;

-- 2. Adicionar campo na tabela nps_respostas_perguntas para salvar a confirmação
ALTER TABLE nps_respostas_perguntas 
ADD COLUMN IF NOT EXISTS confirmou_uso BOOLEAN;

-- 3. Comentários para documentação
COMMENT ON COLUMN nps_perguntas.requer_confirmacao_uso IS 'Indica se a pergunta requer confirmação de uso do serviço/produto antes de ser respondida';
COMMENT ON COLUMN nps_perguntas.texto_confirmacao_uso IS 'Texto da pergunta de confirmação (ex: "Você utilizou a brinquedoteca?")';
COMMENT ON COLUMN nps_respostas_perguntas.confirmou_uso IS 'Resposta da confirmação de uso: true = sim, false = não, null = não aplicável';
