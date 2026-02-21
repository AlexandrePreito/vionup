import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * GET /api/powerbi/cron/process-queue
 *
 * Processa itens pendentes da sync_queue automaticamente.
 * Chamado pelo Vercel Cron a cada 5 minutos.
 *
 * Fluxo:
 * 1. Busca itens com status 'pending' ou 'processing'
 * 2. Para cada item, chama a API /api/powerbi/sync-queue/process em loop
 * 3. Continua até o item completar, falhar, ou atingir o timeout
 *
 * Segurança: exige header Authorization: Bearer <CRON_SECRET>
 */

// Timeout máximo seguro para Vercel Pro (300s = 5 min)
// Deixamos margem de 30s para cleanup
const MAX_EXECUTION_MS = 270_000; // 4.5 minutos

export async function GET(request: NextRequest) {
  // ── Autenticação ──
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || cronSecret.length < 16) {
    console.warn('⚠️ CRON_SECRET não configurado ou muito curto');
    return NextResponse.json({ error: 'Cron não configurado' }, { status: 501 });
  }

  const token = authHeader?.replace(/^Bearer\s+/i, '').trim();
  if (token !== cronSecret) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const startTime = Date.now();
  const results: { queue_id: string; status: string; iterations: number; records?: number; error?: string }[] = [];

  try {
    // ── Buscar itens pendentes ou em processamento ──
    const { data: pendingItems, error: fetchError } = await supabaseAdmin
      .from('sync_queue')
      .select('id, config_id, status, processed_days, total_days')
      .in('status', ['pending', 'processing'])
      .order('created_at', { ascending: true })
      .limit(5); // Máximo 5 itens por execução

    if (fetchError) {
      console.error('❌ Erro ao buscar fila:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!pendingItems?.length) {
      return NextResponse.json({
        ok: true,
        processed: 0,
        message: 'Nenhum item pendente na fila',
      });
    }

    console.log(`🔄 [CRON] Encontrou ${pendingItems.length} itens para processar`);

    // ── Processar cada item ──
    for (const item of pendingItems) {
      // Verificar timeout global
      if (Date.now() - startTime > MAX_EXECUTION_MS) {
        console.log('⏰ [CRON] Timeout atingido, parando processamento');
        break;
      }

      let iterations = 0;
      let lastStatus = 'pending';
      let totalRecords = 0;

      console.log(`📦 [CRON] Processando item ${item.id} (${item.processed_days || 0}/${item.total_days} dias)`);

      // Loop: chamar process até completar ou falhar
      while (Date.now() - startTime < MAX_EXECUTION_MS) {
        iterations++;

        try {
          // Chamar a API de processamento internamente via fetch
          const baseUrl = getBaseUrl(request);
          const processResponse = await fetch(`${baseUrl}/api/powerbi/sync-queue/process`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.CRON_SECRET}`,
              'x-cron-caller': 'process-queue',
              ...(process.env.VERCEL_AUTOMATION_BYPASS_SECRET ? {
                'x-vercel-protection-bypass': process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
              } : {}),
            },
            body: JSON.stringify({ queue_id: item.id }),
          });

          const result = await processResponse.json();
          lastStatus = result.status;
          totalRecords = result.processed_records || totalRecords;

          console.log(`  ↳ Iteração ${iterations}: status=${result.status}, dias=${result.processed_days}/${result.total_days}, registros=${result.day_records || 0}`);

          // Parar se completou, falhou ou está vazio
          if (['completed', 'empty', 'cancelled', 'day_error'].includes(result.status)) {
            if (result.status === 'day_error') {
              console.error(`  ❌ Erro no item ${item.id}: ${result.error}`);
            }
            break;
          }

          // Se ainda está processando, continuar o loop
          // Pequena pausa para não sobrecarregar
          await sleep(500);

        } catch (fetchErr: any) {
          console.error(`  ❌ Erro de fetch no item ${item.id}:`, fetchErr.message);
          lastStatus = 'fetch_error';
          break;
        }
      }

      results.push({
        queue_id: item.id,
        status: lastStatus,
        iterations,
        records: totalRecords,
        ...(lastStatus === 'day_error' || lastStatus === 'fetch_error'
          ? { error: `Falhou após ${iterations} iterações` }
          : {}),
      });
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ [CRON] Finalizado em ${elapsed}s. Processou ${results.length} itens.`);

    return NextResponse.json({
      ok: true,
      processed: results.length,
      elapsed_seconds: parseFloat(elapsed),
      results,
    });

  } catch (err: any) {
    console.error('❌ [CRON] Erro geral:', err);
    return NextResponse.json({ error: err.message ?? 'Erro interno' }, { status: 500 });
  }
}

/** Resolve a URL base do app (funciona na Vercel e localhost) */
function getBaseUrl(request: NextRequest): string {
  // Em produção na Vercel, usar o host do request
  const host = request.headers.get('host');
  const protocol = request.headers.get('x-forwarded-proto') || 'https';
  
  if (host) {
    return `${protocol}://${host}`;
  }
  
  // Fallback: variável de ambiente da Vercel
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  
  return 'http://localhost:3000';
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}