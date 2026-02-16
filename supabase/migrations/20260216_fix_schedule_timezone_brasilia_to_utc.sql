-- Corrige next_run_at dos agendamentos existentes.
-- Antes: o horário era salvo como Brasília mas interpretado como UTC (3h a menos).
-- Solução: somar 3 horas (Brasília = UTC-3) para converter para UTC correto.
--
-- Execute esta migration UMA VEZ após deploy do fix em schedules/route.ts.

UPDATE powerbi_sync_schedules
SET next_run_at = next_run_at + INTERVAL '3 hours'
WHERE next_run_at IS NOT NULL;
