import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET - Listar agendamentos
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const configId = searchParams.get('config_id');

    let query = supabaseAdmin
      .from('powerbi_sync_schedules')
      .select('*')
      .order('time_of_day');

    if (configId) {
      query = query.eq('sync_config_id', configId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao buscar agendamentos:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ schedules: data });
  } catch (error) {
    console.error('Erro ao buscar agendamentos:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// POST - Criar agendamento
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      sync_config_id, 
      schedule_type, 
      day_of_week, 
      time_of_day,
      is_active = true 
    } = body;

    if (!sync_config_id || !schedule_type || !time_of_day) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: sync_config_id, schedule_type, time_of_day' },
        { status: 400 }
      );
    }

    if (!['daily', 'weekly'].includes(schedule_type)) {
      return NextResponse.json(
        { error: 'schedule_type deve ser: daily ou weekly' },
        { status: 400 }
      );
    }

    if (schedule_type === 'weekly' && (day_of_week === undefined || day_of_week < 0 || day_of_week > 6)) {
      return NextResponse.json(
        { error: 'day_of_week é obrigatório para agendamento semanal (0-6)' },
        { status: 400 }
      );
    }

    // Calcular próxima execução
    const nextRunAt = calculateNextRun(schedule_type, day_of_week, time_of_day);

    const { data, error } = await supabaseAdmin
      .from('powerbi_sync_schedules')
      .insert({
        sync_config_id,
        schedule_type,
        day_of_week: schedule_type === 'weekly' ? day_of_week : null,
        time_of_day,
        is_active,
        next_run_at: nextRunAt
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar agendamento:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ schedule: data }, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar agendamento:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

/**
 * Retorna o offset de Brasília em minutos (negativo = Brasília está atrás do UTC).
 * Usa Intl para lidar com horário de verão automaticamente.
 * Brasília normalmente é UTC-3 (-180 min).
 */
function getBrasiliaOffsetMinutes(date: Date): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const get = (type: string) => parseInt(parts.find(p => p.type === type)?.value || '0', 10);

  const brasiliaAsUtc = new Date(Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second')
  ));

  return Math.round((brasiliaAsUtc.getTime() - date.getTime()) / 60000);
}

/**
 * Calcula o próximo next_run_at em UTC.
 * O time_of_day vem do frontend em horário de Brasília (America/Sao_Paulo).
 */
function calculateNextRun(scheduleType: string, dayOfWeek: number | undefined, timeOfDay: string): string {
  const now = new Date();
  const [hours, minutes] = timeOfDay.split(':').map(Number);

  const brasiliaOffset = getBrasiliaOffsetMinutes(now);
  const offsetHours = Math.abs(brasiliaOffset) / 60;

  const nextRun = new Date();
  nextRun.setUTCHours(hours + offsetHours, minutes, 0, 0);

  if (scheduleType === 'daily') {
    if (nextRun <= now) {
      nextRun.setUTCDate(nextRun.getUTCDate() + 1);
    }
  } else if (scheduleType === 'weekly' && dayOfWeek !== undefined) {
    const currentDay = nextRun.getUTCDay();
    let daysUntil = dayOfWeek - currentDay;
    if (daysUntil < 0 || (daysUntil === 0 && nextRun <= now)) {
      daysUntil += 7;
    }
    nextRun.setUTCDate(nextRun.getUTCDate() + daysUntil);
  }

  return nextRun.toISOString();
}
