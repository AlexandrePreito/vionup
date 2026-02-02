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

// Função para calcular próxima execução
function calculateNextRun(scheduleType: string, dayOfWeek: number | undefined, timeOfDay: string): string {
  const now = new Date();
  const [hours, minutes] = timeOfDay.split(':').map(Number);
  
  const nextRun = new Date();
  nextRun.setHours(hours, minutes, 0, 0);

  if (scheduleType === 'daily') {
    // Se já passou o horário hoje, agenda para amanhã
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }
  } else if (scheduleType === 'weekly' && dayOfWeek !== undefined) {
    // Encontrar próximo dia da semana
    const currentDay = now.getDay();
    let daysUntil = dayOfWeek - currentDay;
    
    if (daysUntil < 0 || (daysUntil === 0 && nextRun <= now)) {
      daysUntil += 7;
    }
    
    nextRun.setDate(nextRun.getDate() + daysUntil);
  }

  return nextRun.toISOString();
}
