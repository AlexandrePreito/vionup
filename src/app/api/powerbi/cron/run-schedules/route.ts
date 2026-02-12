import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * GET /api/powerbi/cron/run-schedules
 *
 * Executa agendamentos de sincronização Power BI que estão no horário.
 * Chamado pelo Vercel Cron (ou outro cron externo).
 *
 * Segurança: exige header Authorization: Bearer <CRON_SECRET> (variável CRON_SECRET no Vercel).
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || cronSecret.length < 16) {
    console.warn('⚠️ CRON_SECRET não configurado ou muito curto (mín. 16 caracteres)');
    return NextResponse.json({ error: 'Cron não configurado' }, { status: 501 });
  }

  const token = authHeader?.replace(/^Bearer\s+/i, '').trim();
  if (token !== cronSecret) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const now = new Date().toISOString();

  try {
    const { data: dueSchedules, error: scheduleError } = await supabaseAdmin
      .from('powerbi_sync_schedules')
      .select('id, sync_config_id, schedule_type, day_of_week, time_of_day, next_run_at')
      .eq('is_active', true)
      .lte('next_run_at', now);

    if (scheduleError) {
      console.error('❌ Cron: erro ao buscar agendamentos:', scheduleError);
      return NextResponse.json({ error: scheduleError.message }, { status: 500 });
    }

    if (!dueSchedules?.length) {
      return NextResponse.json({ ok: true, triggered: 0, message: 'Nenhum agendamento no horário' });
    }

    const results: { scheduleId: string; configId: string; status: string; detail?: string }[] = [];

    for (const schedule of dueSchedules) {
      const configId = schedule.sync_config_id;

      const { data: config, error: configError } = await supabaseAdmin
        .from('powerbi_sync_configs')
        .select(`
          id,
          connection_id,
          is_incremental,
          incremental_days,
          initial_date,
          connection:powerbi_connections(company_group_id)
        `)
        .eq('id', configId)
        .single();

      if (configError || !config) {
        results.push({ scheduleId: schedule.id, configId, status: 'error', detail: 'Config não encontrada' });
        await updateScheduleNextRun(schedule);
        continue;
      }

      const companyGroupId = (config as any).connection?.company_group_id;
      if (!companyGroupId) {
        results.push({ scheduleId: schedule.id, configId, status: 'error', detail: 'company_group_id ausente' });
        await updateScheduleNextRun(schedule);
        continue;
      }

      const { data: existingItem } = await supabaseAdmin
        .from('sync_queue')
        .select('id')
        .eq('config_id', configId)
        .in('status', ['pending', 'processing'])
        .limit(1)
        .maybeSingle();

      if (existingItem) {
        results.push({ scheduleId: schedule.id, configId, status: 'skipped', detail: 'Já existe sync pendente' });
        await updateScheduleNextRun(schedule);
        continue;
      }

      const today = new Date();
      const syncType = config.is_incremental ? 'incremental' : 'full';
      let startDate: Date;
      if (syncType === 'incremental' && config.is_incremental) {
        const daysBack = config.incremental_days ?? 7;
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - daysBack);
      } else {
        startDate = config.initial_date ? new Date(config.initial_date) : new Date('2024-01-01');
      }
      const endDate = today;
      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000) + 1;

      const { error: insertError } = await supabaseAdmin
        .from('sync_queue')
        .insert({
          connection_id: config.connection_id,
          config_id: config.id,
          company_group_id: companyGroupId,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          sync_type: syncType,
          total_days: totalDays,
          status: 'pending',
        });

      if (insertError) {
        results.push({ scheduleId: schedule.id, configId, status: 'error', detail: insertError.message });
      } else {
        results.push({ scheduleId: schedule.id, configId, status: 'queued' });
      }

      await updateScheduleNextRun(schedule);
    }

    return NextResponse.json({
      ok: true,
      triggered: dueSchedules.length,
      results,
    });
  } catch (err: any) {
    console.error('❌ Cron run-schedules:', err);
    return NextResponse.json({ error: err.message ?? 'Erro interno' }, { status: 500 });
  }
}

/** Avança para a próxima execução mantendo o mesmo horário (next_run_at já está em UTC). */
function getNextRunAt(
  currentNextRunAt: string,
  scheduleType: string,
  dayOfWeek: number | null
): string {
  const next = new Date(currentNextRunAt);
  if (scheduleType === 'daily') {
    next.setUTCDate(next.getUTCDate() + 1);
  } else if (scheduleType === 'weekly' && dayOfWeek !== null && dayOfWeek !== undefined) {
    next.setUTCDate(next.getUTCDate() + 7);
  } else {
    next.setUTCDate(next.getUTCDate() + 1);
  }
  return next.toISOString();
}

async function updateScheduleNextRun(schedule: {
  id: string;
  schedule_type: string;
  day_of_week: number | null;
  time_of_day: string;
  next_run_at: string;
}): Promise<void> {
  const nextRunAt = getNextRunAt(schedule.next_run_at, schedule.schedule_type, schedule.day_of_week);
  await supabaseAdmin
    .from('powerbi_sync_schedules')
    .update({ next_run_at: nextRunAt })
    .eq('id', schedule.id);
}
