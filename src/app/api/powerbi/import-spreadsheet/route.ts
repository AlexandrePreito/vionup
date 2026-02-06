import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import * as XLSX from 'xlsx';

// ============================================================
// Mapeamento de colunas Power BI → campos do banco
// Suporta tanto "Empresa" quanto "VendaItemGeral[Empresa]" e "[cost]"
// ============================================================
const COLUMN_MAPPINGS: Record<string, Record<string, string>> = {
  sales: {
    'Empresa': 'external_company_id',
    'VendaItemGeral[Empresa]': 'external_company_id',
    'idVenda': 'venda_id',
    'IdVenda': 'venda_id',
    'VendaItemGeral[idVenda]': 'venda_id',
    'VendaItemGeral[IdVenda]': 'venda_id',
    'venda_id': 'venda_id',
    'dt_contabil': 'sale_date',
    'VendaItemGeral[dt_contabil]': 'sale_date',
    'CodigoMaterial': 'external_product_id',
    'VendaItemGeral[CodigoMaterial]': 'external_product_id',
    'modo_venda_descr': 'sale_mode',
    'VendaItemGeral[modo_venda_descr]': 'sale_mode',
    'CodigoFuncionario': 'external_employee_id',
    'VendaItemGeral[CodigoFuncionario]': 'external_employee_id',
    'cost': 'cost',
    '[cost]': 'cost',
    'CMV': 'cost',
    'quantity': 'quantity',
    '[quantity]': 'quantity',
    'Quantidades': 'quantity',
    'total_value': 'total_value',
    '[total_value]': 'total_value',
    'Vendas Valor': 'total_value',
  },
  cash_flow: {
    'tipo': 'transaction_type',
    'CaixaItem[tipo]': 'transaction_type',
    'Empresa': 'external_company_id',
    'CaixaItem[Empresa]': 'external_company_id',
    'idCaixa': '_id_caixa',
    'CaixaItem[idCaixa]': '_id_caixa',
    'meio_nome': 'payment_method',
    'CaixaItem[meio_nome]': 'payment_method',
    'modo_venda': 'transaction_mode',
    'CaixaItem[modo_venda]': 'transaction_mode',
    'dt_contabil': 'transaction_date',
    'CaixaItem[dt_contabil]': 'transaction_date',
    'CodigoFuncionario': 'external_employee_id',
    'CaixaItem[CodigoFuncionario]': 'external_employee_id',
    'amount': 'amount',
    '[amount]': 'amount',
    'Caixa': 'amount',
    '[Caixa]': 'amount',
    'valor': 'amount',
    '[valor]': 'amount',
    'Periodo': 'period',
    'CaixaItem[Periodo]': 'period',
    'periodo': 'period',
  },
  cash_flow_statement: {
    'Filial': 'external_company_id',
    'Extrato[Filial]': 'external_company_id',
    'idCategoria': 'category_id',
    'Extrato[idCategoria]': 'category_id',
    'Data movimento': 'transaction_date',
    'Extrato[Data movimento]': 'transaction_date',
    'amount': 'amount',
    '[amount]': 'amount',
    'Resultado2': 'amount',
  },
};

const TABLE_MAP: Record<string, string> = {
  sales: 'external_sales',
  cash_flow: 'external_cash_flow',
  cash_flow_statement: 'external_cash_flow_statement',
};

const REQUIRED_DB_FIELDS: Record<string, string[]> = {
  sales: ['external_company_id', 'sale_date', 'external_product_id', 'quantity', 'total_value'],
  cash_flow: ['transaction_date', 'amount'],
  cash_flow_statement: ['transaction_date', 'amount', 'category_id'],
};

// ============================================================
// Helpers
// ============================================================
function parseDate(value: any): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().split('T')[0];

  const str = String(value).trim();

  // Excel serial date
  if (/^\d{5}(\.\d+)?$/.test(str)) {
    const d = new Date((parseFloat(str) - 25569) * 86400000);
    return d.toISOString().split('T')[0];
  }
  // ISO: 2026-02-03...
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.substring(0, 10);
  // BR: 03/02/2026
  const br = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  // Fallback
  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? null : parsed.toISOString().split('T')[0];
}

/** Converte valor numérico do formato brasileiro para número */
function parseNumericBR(value: any): number {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return value;
  
  // Converter para string e tratar formato brasileiro
  let str = String(value).trim();
  
  // Remover pontos de milhar e trocar vírgula por ponto
  // Ex: "1.234,56" -> "1234.56"
  str = str.replace(/\./g, '').replace(',', '.');
  
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

function simpleHash(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    h = h & h;
  }
  return Math.abs(h).toString(36).padStart(8, '0').substring(0, 8);
}

function generateExternalId(entityType: string, rec: Record<string, any>, idx: number): string {
  let parts: string[];
  if (entityType === 'sales') {
    parts = [String(rec.external_company_id||''), String(rec.sale_date||''), String(rec.external_product_id||''), String(rec.venda_id||''), String(rec.quantity||''), String(rec.total_value||'')];
  } else if (entityType === 'cash_flow') {
    parts = [String(rec.external_company_id||''), String(rec.transaction_date||''), String(rec._id_caixa||idx), String(rec.amount||''), String(rec.payment_method||'')];
  } else {
    parts = [String(rec.external_company_id||''), String(rec.transaction_date||''), String(rec.category_id||''), String(rec.amount||'')];
  }
  return `${entityType}_imp_${simpleHash(parts.join('|'))}`;
}

// ============================================================
// POST handler
// ============================================================
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const entityType = formData.get('entity_type') as string;
    let companyGroupId = formData.get('company_group_id') as string;
    
    console.log('📤 company_group_id recebido:', companyGroupId);
    
    if (!companyGroupId || companyGroupId === 'undefined' || companyGroupId === 'null') {
      console.log('❌ company_group_id inválido:', companyGroupId);
      return NextResponse.json({ error: `Selecione um grupo antes de importar. Valor recebido: ${companyGroupId}` }, { status: 400 });
    }

    if (!file || !entityType || !companyGroupId) {
      return NextResponse.json({ error: 'file, entity_type e company_group_id são obrigatórios' }, { status: 400 });
    }
    if (!COLUMN_MAPPINGS[entityType]) {
      return NextResponse.json({ error: `Tipo não suportado: ${entityType}. Use: sales, cash_flow, cash_flow_statement` }, { status: 400 });
    }

    // Ler arquivo
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = file.name.toLowerCase();
    const isCSV = fileName.endsWith('.csv') || fileName.endsWith('.txt');
    
    let rows: Record<string, any>[] = [];
    
    if (isCSV) {
      // Parse manual do CSV para tratar separador ; corretamente
      const text = buffer.toString('utf-8');
      const lines = text.split('\n').filter(l => l.trim());
      
      if (lines.length === 0) {
        return NextResponse.json({ error: 'Planilha vazia' }, { status: 400 });
      }
      
      // Detectar separador: contar ; e , na primeira linha
      const firstLine = lines[0];
      const semicolonCount = (firstLine.match(/;/g) || []).length;
      const commaCount = (firstLine.match(/,/g) || []).length;
      const separator = semicolonCount > commaCount ? ';' : ',';
      
      console.log(`📤 Separador detectado: "${separator}" (${semicolonCount} ; vs ${commaCount} ,)`);
      
      if (separator === ';') {
        // Parse manual para CSV com separador ;
        const headers = lines[0].split(';').map(h => h.replace(/^"|"$/g, '').trim());
        console.log(`📤 Headers detectados (${headers.length}):`, headers);
        
        rows = lines.slice(1)
          .filter(line => line.trim()) // Ignorar linhas vazias
          .map((line) => {
            const values = line.split(';').map(v => {
              // Remover aspas e espaços
              const cleaned = v.replace(/^"|"$/g, '').trim();
              // Se estiver vazio, retornar null
              return cleaned === '' ? null : cleaned;
            });
            
            const obj: Record<string, any> = {};
            headers.forEach((h, i) => {
              obj[h] = values[i] !== undefined ? values[i] : null;
            });
            return obj;
          });
        
        console.log(`📤 Parse manual: ${rows.length} linhas processadas`);
        if (rows.length > 0) {
          console.log(`📤 Primeira linha parseada:`, Object.keys(rows[0]));
        }
      } else {
        // Usar XLSX para CSV com separador ,
        const wb = XLSX.read(text, { type: 'string', raw: false });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json(sheet);
      }
    } else {
      // Arquivo Excel (.xlsx, .xls)
      const wb = XLSX.read(buffer, { type: 'buffer', raw: false });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      rows = XLSX.utils.sheet_to_json(sheet);
    }

    if (!rows?.length) {
      return NextResponse.json({ error: 'Planilha vazia' }, { status: 400 });
    }

    console.log(`📤 Importação: ${rows.length} linhas de ${entityType} (${file.name})`);

    // Detectar mapeamento de colunas
    const colMap = COLUMN_MAPPINGS[entityType];
    const fileColumns = Object.keys(rows[0]);
    const detected: Record<string, string> = {};

    for (const fc of fileColumns) {
      if (colMap[fc]) { detected[fc] = colMap[fc]; continue; }
      const clean = fc.replace(/.*\[(.+)\]/, '$1');
      if (colMap[clean]) { detected[fc] = colMap[clean]; continue; }
      for (const [mk, mv] of Object.entries(colMap)) {
        if (mk.toLowerCase() === fc.toLowerCase()) { detected[fc] = mv; break; }
      }
    }

    console.log(`📤 Mapeamento:`, detected);
    console.log(`📤 Colunas do CSV:`, fileColumns);
    
    // Log de colunas não mapeadas
    const unmappedColumns = fileColumns.filter(h => !detected[h]);
    if (unmappedColumns.length > 0) {
      console.log('⚠️ Colunas não mapeadas:', unmappedColumns);
    }

    // Verificar obrigatórios
    const mappedFields = new Set(Object.values(detected));
    const missing = REQUIRED_DB_FIELDS[entityType].filter(f => !mappedFields.has(f));
    if (missing.length > 0) {
      // Mensagem específica para amount em cash_flow
      if (entityType === 'cash_flow' && missing.includes('amount')) {
        return NextResponse.json({
          error: `Campo 'amount' não encontrado no CSV. Colunas disponíveis: ${fileColumns.join(', ')}`,
          detected_columns: fileColumns,
          detected_mapping: detected,
          missing_fields: missing,
        }, { status: 400 });
      }
      
      return NextResponse.json({
        error: `Campos obrigatórios não encontrados: ${missing.join(', ')}`,
        detected_columns: fileColumns,
        detected_mapping: detected,
        missing_fields: missing,
      }, { status: 400 });
    }

    // Transformar
    const dateFields = entityType === 'sales' ? ['sale_date'] : ['transaction_date'];
    const numericFields = entityType === 'sales' ? ['cost', 'quantity', 'total_value'] : ['amount'];
    const records: Record<string, any>[] = [];
    const warnings: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rec: Record<string, any> = { company_group_id: companyGroupId };

      for (const [fc, dbf] of Object.entries(detected)) {
        let v = row[fc];
        if (dateFields.includes(dbf)) {
          v = parseDate(v);
          if (!v && i < 5) warnings.push(`Linha ${i+2}: data inválida "${fc}"`);
        }
        if (numericFields.includes(dbf)) {
          v = parseNumericBR(v);
        }
        rec[dbf] = v;
      }

      rec.external_id = generateExternalId(entityType, rec, i);
      rec.raw_data = JSON.stringify(row);

      if (entityType === 'sales') {
        rec.external_company_id = String(rec.external_company_id || 'UNKNOWN');
        rec.external_product_id = String(rec.external_product_id || 'UNKNOWN');
        rec.period = rec.sale_date?.substring(0, 7) || null;
      } else if (entityType === 'cash_flow') {
        rec.external_company_id = rec.external_company_id ? String(rec.external_company_id) : null;
        // Se period veio do CSV (mapeado), usar esse valor. Caso contrário, gerar YYYY-MM da data
        if (!rec.period || rec.period === '') {
          rec.period = rec.transaction_date?.substring(0, 7) || null;
        } else {
          // Manter o valor do CSV (ex: "Almoço", "Jantar")
          rec.period = String(rec.period).trim();
        }
        delete rec._id_caixa; // campo auxiliar, não existe no banco
      } else if (entityType === 'cash_flow_statement') {
        rec.external_company_id = rec.external_company_id ? String(rec.external_company_id) : null;
      }

      records.push(rec);
    }

    if (!records.length) {
      return NextResponse.json({ error: 'Nenhum registro válido', warnings }, { status: 400 });
    }

    // Salvar em lotes
    const targetTable = TABLE_MAP[entityType];
    const BATCH = 200;
    let saved = 0, failed = 0;

    for (let i = 0; i < records.length; i += BATCH) {
      const batch = records.slice(i, i + BATCH);
      const { error } = await supabaseAdmin
        .from(targetTable)
        .upsert(batch, { onConflict: 'company_group_id,external_id', ignoreDuplicates: false });

      if (error) {
        console.error(`❌ Lote ${Math.floor(i/BATCH)+1}:`, error.message);
        failed += batch.length;
      } else {
        saved += batch.length;
      }
    }

    console.log(`✅ Importação: ${saved} salvos, ${failed} falharam de ${records.length}`);

    return NextResponse.json({ success: true, total_rows: rows.length, saved, failed, warnings: warnings.slice(0, 10), detected_mapping: detected });
  } catch (err: any) {
    console.error('❌ Erro importação:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
