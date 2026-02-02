import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import * as XLSX from 'xlsx';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const companyId = formData.get('company_id') as string;
    const companyGroupId = formData.get('company_group_id') as string;
    const year = parseInt(formData.get('year') as string);
    const month = parseInt(formData.get('month') as string);

    if (!file || !companyId || !companyGroupId || !year || !month) {
      return NextResponse.json(
        { error: 'Arquivo, empresa, grupo, ano e mês são obrigatórios' },
        { status: 400 }
      );
    }

    // Ler arquivo Excel
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];

    if (data.length < 2) {
      return NextResponse.json(
        { error: 'Planilha vazia ou inválida' },
        { status: 400 }
      );
    }

    // Remover cabeçalho
    const rows = data.slice(1).filter(row => row && row.length > 0);

    // Estrutura para armazenar metas
    let companyRevenueGoal: any = null;
    const shiftGoals: Array<{ name: string; value: number }> = [];
    const saleModeGoals: Array<{ name: string; value: number; parentShift?: string }> = [];

    // Processar linhas
    for (const row of rows) {
      const tipo = String(row[0] || '').trim();
      const descricao = String(row[1] || '').trim();
      const valor = parseFloat(String(row[2] || '0').replace(',', '.'));

      if (!tipo || !descricao || isNaN(valor) || valor <= 0) {
        continue; // Pular linhas inválidas
      }

      if (tipo.toLowerCase().includes('faturamento') || tipo.toLowerCase().includes('empresa')) {
        companyRevenueGoal = { value: valor };
      } else if (tipo.toLowerCase().includes('turno')) {
        shiftGoals.push({ name: descricao, value: valor });
      } else if (tipo.toLowerCase().includes('modo') || tipo.toLowerCase().includes('venda')) {
        // Tentar identificar o turno pai pela observação ou ordem
        const observacao = String(row[3] || '').toLowerCase();
        let parentShift: string | undefined;
        
        // Procurar referência ao turno na observação
        for (const shift of shiftGoals) {
          if (observacao.includes(shift.name.toLowerCase())) {
            parentShift = shift.name;
            break;
          }
        }
        
        saleModeGoals.push({ name: descricao, value: valor, parentShift });
      }
    }

    if (!companyRevenueGoal) {
      return NextResponse.json(
        { error: 'Meta de faturamento da empresa é obrigatória' },
        { status: 400 }
      );
    }

    const results = {
      created: 0,
      errors: [] as string[],
      details: [] as string[]
    };

    // 1. Criar meta de faturamento da empresa
    try {
      const { data: goal, error: goalError } = await supabaseAdmin
        .from('sales_goals')
        .insert({
          company_group_id: companyGroupId,
          company_id: companyId,
          goal_type: 'company_revenue',
          year,
          month,
          goal_value: companyRevenueGoal.value,
          goal_unit: 'currency',
          is_active: true
        })
        .select()
        .single();

      if (goalError) {
        if (goalError.code === '23505') {
          // Meta já existe, atualizar
          const { error: updateError } = await supabaseAdmin
            .from('sales_goals')
            .update({ goal_value: companyRevenueGoal.value })
            .eq('company_group_id', companyGroupId)
            .eq('company_id', companyId)
            .eq('goal_type', 'company_revenue')
            .eq('year', year)
            .eq('month', month);

          if (updateError) {
            results.errors.push(`Erro ao atualizar meta de faturamento: ${updateError.message}`);
          } else {
            results.created++;
            results.details.push('Meta de faturamento atualizada');
          }
        } else {
          results.errors.push(`Erro ao criar meta de faturamento: ${goalError.message}`);
        }
      } else {
        results.created++;
        results.details.push('Meta de faturamento criada');
        const companyGoalId = goal.id;

        // 2. Criar metas de turno (se houver)
        if (shiftGoals.length > 0) {
          for (const shiftGoal of shiftGoals) {
            // Buscar turno pelo nome
            const { data: shift } = await supabaseAdmin
              .from('shifts')
              .select('id')
              .eq('name', shiftGoal.name)
              .eq('company_group_id', companyGroupId)
              .single();

            if (!shift) {
              results.errors.push(`Turno "${shiftGoal.name}" não encontrado`);
              continue;
            }

            const { error: shiftError } = await supabaseAdmin
              .from('sales_goals')
              .upsert({
                company_group_id: companyGroupId,
                company_id: companyId,
                goal_type: 'shift',
                year,
                month,
                shift_id: shift.id,
                goal_value: shiftGoal.value,
                goal_unit: 'currency',
                parent_goal_id: companyGoalId,
                is_active: true
              }, {
                onConflict: 'company_group_id,company_id,goal_type,year,month,shift_id'
              });

            if (shiftError) {
              results.errors.push(`Erro ao criar meta de turno "${shiftGoal.name}": ${shiftError.message}`);
            } else {
              results.created++;
              results.details.push(`Meta de turno "${shiftGoal.name}" criada`);
            }
          }
        }

        // 3. Criar metas de modo de venda (se houver)
        if (saleModeGoals.length > 0) {
          // Buscar IDs dos turnos criados
          const { data: createdShifts } = await supabaseAdmin
            .from('sales_goals')
            .select('id, shift:shifts(name)')
            .eq('company_group_id', companyGroupId)
            .eq('company_id', companyId)
            .eq('goal_type', 'shift')
            .eq('year', year)
            .eq('month', month);

          const shiftIdMap: Record<string, string> = {};
          if (createdShifts) {
            for (const shiftGoal of createdShifts) {
              const shiftName = (shiftGoal.shift as any)?.name;
              if (shiftName) {
                shiftIdMap[shiftName] = shiftGoal.id;
              }
            }
          }

          for (const modeGoal of saleModeGoals) {
            // Buscar modo de venda pelo nome
            const { data: saleMode } = await supabaseAdmin
              .from('sale_modes')
              .select('id')
              .eq('name', modeGoal.name)
              .eq('company_group_id', companyGroupId)
              .single();

            if (!saleMode) {
              results.errors.push(`Modo de venda "${modeGoal.name}" não encontrado`);
              continue;
            }

            // Determinar parent_goal_id
            let parentGoalId = companyGoalId;
            if (modeGoal.parentShift && shiftIdMap[modeGoal.parentShift]) {
              parentGoalId = shiftIdMap[modeGoal.parentShift];
            }

            const { error: modeError } = await supabaseAdmin
              .from('sales_goals')
              .upsert({
                company_group_id: companyGroupId,
                company_id: companyId,
                goal_type: 'sale_mode',
                year,
                month,
                sale_mode_id: saleMode.id,
                goal_value: modeGoal.value,
                goal_unit: 'currency',
                parent_goal_id: parentGoalId,
                is_active: true
              }, {
                onConflict: 'company_group_id,company_id,goal_type,year,month,sale_mode_id'
              });

            if (modeError) {
              results.errors.push(`Erro ao criar meta de modo "${modeGoal.name}": ${modeError.message}`);
            } else {
              results.created++;
              results.details.push(`Meta de modo "${modeGoal.name}" criada`);
            }
          }
        }
      }
    } catch (error: any) {
      results.errors.push(`Erro geral: ${error.message}`);
    }

    return NextResponse.json({
      success: results.errors.length === 0,
      message: `${results.created} meta(s) criada(s) com sucesso`,
      details: results.details,
      errors: results.errors
    });

  } catch (error: any) {
    console.error('Erro ao importar metas:', error);
    return NextResponse.json(
      { error: `Erro ao processar arquivo: ${error.message}` },
      { status: 500 }
    );
  }
}
