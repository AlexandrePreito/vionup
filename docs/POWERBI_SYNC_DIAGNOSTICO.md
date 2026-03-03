# Power BI Sync - Diagnóstico e Correções

## Sistema
**Vion Up!** — Sincronização Power BI → Supabase → Dashboards
- **Arquivo principal:** `src/app/api/powerbi/sync-queue/process/route.ts`
- **Tabelas:** `external_sales`, `external_cash_flow`

---

## Problema 1: external_sales — RESOLVIDO ✅

### Causa
`generateExternalId()` não tinha `case 'sales'`. Caía no `default` com hash de `JSON.stringify(row)` — variável a cada sync.

### Correção
Adicionado `case 'sales'` usando `venda_id|productId|companyId|employeeId|qty|value` para hash determinístico.

---

## Problema 2: external_cash_flow — CORREÇÃO APLICADA 🔧

### Sintoma
Valores inflados (ex: dia 24/02 — Power BI 167 reg, Supabase 378 reg).

### Causa
`SUMMARIZECOLUMNS` com muitos campos (CodigoFuncionario, meio_nome, modo_venda, Periodo) expande linhas no Power BI.

### Correção
Nova query usando `ADDCOLUMNS` + `SUMMARIZE` — uma linha por `idCaixa+Empresa+dt_contabil`.

**Migration:** `supabase/migrations/20260221_cash_flow_dax_query_addcolumns.sql`

### ⚠️ Antes de aplicar em produção

1. **Testar no Power BI (DAX Studio):**
   ```dax
   EVALUATE
   FILTER(
     ADDCOLUMNS(
       SUMMARIZE(CaixaItem, CaixaItem[idCaixa], CaixaItem[Empresa], CaixaItem[dt_contabil]),
       "amount", [Caixa],
       "tipo", FIRSTNONBLANK(CaixaItem[tipo], 1),
       "meio_nome", FIRSTNONBLANK(CaixaItem[meio_nome], 1),
       "modo_venda", FIRSTNONBLANK(CaixaItem[modo_venda], 1),
       "CodigoFuncionario", FIRSTNONBLANK(CaixaItem[CodigoFuncionario], 1),
       "Periodo", FIRSTNONBLANK(CaixaItem[Periodo], 1)
     ),
     CaixaItem[Empresa] = "01" && CaixaItem[dt_contabil] = DATE(2026, 2, 24)
   )
   ```
   Deve retornar ~167 registros (não 378).

2. **Aplicar migration:**
   ```bash
   npx supabase db push
   ```
   Ou executar o SQL manualmente no Supabase.

3. **Limpar e resincronizar:**
   ```sql
   DELETE FROM external_cash_flow 
   WHERE company_group_id = 'e48b81a9-97b5-4299-8cea-dce3ee919f5f';
   ```
   Depois, rodar a sincronização de cash_flow pela interface.

---

## Queries de diagnóstico

### Duplicatas em cash_flow
```sql
SELECT external_id, COUNT(*) as qty
FROM external_cash_flow
WHERE company_group_id = 'e48b81a9-97b5-4299-8cea-dce3ee919f5f'
GROUP BY external_id
HAVING COUNT(*) > 1
LIMIT 20;
```

### Totais por dia (Jd da Luz)
```sql
SELECT transaction_date, COUNT(*) as registros, SUM(amount) as total
FROM external_cash_flow
WHERE company_group_id = 'e48b81a9-97b5-4299-8cea-dce3ee919f5f'
  AND external_company_id = '01'
  AND transaction_date >= '2026-02-01'
GROUP BY transaction_date
ORDER BY transaction_date;
```

### Config atual
```sql
SELECT id, entity_type, LEFT(dax_query, 500) as dax_preview
FROM powerbi_sync_configs
WHERE entity_type = 'cash_flow';
```

---

*Última atualização: Fevereiro 2025*
