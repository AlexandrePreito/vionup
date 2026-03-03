# Documentação do Sistema Vion Up!

Sistema de gestão empresarial com foco em metas, previsões, compras e análise de dados. Esta documentação aborda a **sincronização de dados** e os **dashboards**.

---

## Índice

1. [Visão Geral](#1-visão-geral)
2. [Sincronização Power BI](#2-sincronização-power-bi)
3. [Dashboards](#3-dashboards)
4. [Fluxo de Dados](#4-fluxo-de-dados)
5. [Tabelas e Mapeamentos](#5-tabelas-e-mapeamentos)

---

## 1. Visão Geral

O sistema consome dados do **Power BI** via sincronização e os utiliza em diversos **dashboards** para análise de faturamento, metas e projeções.

### Arquitetura de Dados

```
┌─────────────────┐     Sincronização      ┌──────────────────┐     APIs      ┌─────────────────┐
│   Power BI      │ ──────────────────────► │  Supabase        │ ─────────────► │  Dashboards     │
│   (Datasets)    │   external_sales        │  external_*      │  /api/        │  (Frontend)     │
│                 │   external_cash_flow    │  company_        │  dashboard/*  │                 │
│                 │   external_products    │  mappings        │               │                 │
└─────────────────┘                         └──────────────────┘               └─────────────────┘
```

---

## 2. Sincronização Power BI

### 2.1 Visão Geral

A sincronização importa dados de datasets do Power BI para o Supabase. Os dados são armazenados em tabelas `external_*` e vinculados às entidades internas via mapeamentos (`company_mappings`, `employee_mappings`, etc.).

### 2.2 Entidades Sincronizadas

| Entidade | Tabela Destino | Incremental | Descrição |
|----------|----------------|-------------|-----------|
| Empresas | `external_companies` | Não | Filiais/empresas do Power BI |
| Funcionários | `external_employees` | Não | Vendedores/atendentes |
| Produtos | `external_products` | Não | Produtos de venda |
| Vendas | `external_sales` | Sim | Itens de venda (linha a linha) |
| Caixa | `external_cash_flow` | Sim | Movimentações de caixa |
| Estoque | `external_stock` | Não | Estoque por produto/empresa |
| Categorias | `external_categories` | Não | Categorias de produtos |

### 2.3 Modos de Sincronização

- **Incremental (🟢):** Atualiza apenas os últimos N dias. Usa UPSERT. Não deleta histórico.
- **Completa (🔵):** Recarrega período inteiro. DELETE + INSERT. Garante alinhamento 100% com Power BI.
- **Inicial (🟡):** Primeira sincronização da entidade.

### 2.4 Fluxo de Sincronização

1. **Usuário inicia sync** → Frontend chama `POST /api/powerbi/sync-queue`
2. **Item na fila** → Registro em `sync_queue` (status: `pending`)
3. **Processamento** → `POST /api/powerbi/sync-queue/process` processa 1 dia por vez
4. **Token Power BI** → Cache em memória (50 min)
5. **Query DAX** → Executada no Power BI com filtro de data
6. **Transformação** → Mapeamento de campos conforme `field_mapping`
7. **Deduplicação** → Por `external_id` (único por grupo)
8. **Upsert** → Salva em lotes de ~200 registros

### 2.5 Identificadores Únicos (external_id)

O `external_id` deve ser único por `company_group_id`. Para evitar colisões entre filiais:

- **Cash Flow:** `idCaixa-empresa` (ex: `276366-03`, `276366-04`)
- **Sales:** Geralmente `venda_id` ou combinação de campos

### 2.6 Configuração

- **Conexões:** `/powerbi/conexoes` — tenant_id, client_id, client_secret, workspace_id
- **Configs:** `/powerbi/sincronizacao` — dataset, tabela, query DAX, mapeamento de campos
- **Campo de data:** Para entidades incrementais (ex: `dt_contabil`)
- **Dias incremental:** Quantos dias sincronizar no modo incremental

### 2.7 APIs de Sincronização

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/powerbi/sync-queue` | POST | Adiciona item à fila |
| `/api/powerbi/sync-queue` | GET | Lista itens da fila |
| `/api/powerbi/sync-queue/process` | POST | Processa item da fila |
| `/api/powerbi/cron/process-queue` | GET | Processa fila (cron/Vercel) |

---

## 3. Dashboards

### 3.1 Dashboard Realizado (Mensal)

**Rota:** `/dashboard/realizado`  
**API:** `GET /api/dashboard/realizado`

**Fonte de dados:** `external_cash_flow` (fluxo de caixa)

**Filtros:** `group_id`, `year`, `month`, `company_id` (opcional)

**Funcionalidades:**
- Faturamento total e por empresa
- Comparação MoM (mês anterior) e YoY (ano anterior)
- Gráfico de faturamento diário
- Melhor e pior dia do mês
- Faturamento por modo de venda e turno (Almoço/Jantar)
- Tabela dia a dia por empresa (`dailyRevenueByCompany`)

**Mapeamento empresa:** `company_mappings` → `external_companies` (external_id como "01", "02", etc.)

**Filtro por empresa:** Ao selecionar empresa, o gráfico usa dados reais de `dailyRevenueByCompany`, não proporção.

---

### 3.2 Dashboard Empresa

**Rota:** `/dashboard/empresa`  
**API:** `GET /api/dashboard/company`

**Fonte de dados:** `external_cash_flow`, metas em `sales_goals`

**Filtros:** `company_id`, `group_id`, `year`, `month`, `shift_filter`

**Funcionalidades:**
- Meta vs realizado de faturamento
- Metas por turno (Almoço, Jantar)
- Metas por modo de venda
- Projeção de tendência (dias restantes)
- Ticket médio e quantidade de vendas

---

### 3.3 Dashboard Funcionário

**Rota:** `/dashboard/funcionario`  
**API:** `GET /api/dashboard/employee`

**Fonte de dados:** `external_sales` (vendas linha a linha)

**Filtros:** `employee_id`, `group_id`, `year`, `month`

**Funcionalidades:**
- Meta vs realizado de faturamento
- Ranking do funcionário na empresa
- Metas de produtos (quantidade por produto)
- Vendas diárias (gráfico de barras)
- Faturamento mensal (últimos 12 meses)
- Projeção de tendência (média dia útil vs fim de semana)

**Mapeamento funcionário:** `employee_mappings` → `external_employees` (código externo)

**Cálculos:**
- Valor realizado = `SUM(total_value)` de `external_sales`
- Vendas distintas = `COUNT(DISTINCT sale_uuid)` ou `venda_id`
- Ticket médio = `SUM(total_value) / COUNT(DISTINCT sale_uuid)`

---

### 3.4 Dashboard Equipe (Team)

**Rota:** `/dashboard/equipe` (ou similar)  
**API:** `GET /api/dashboard/team`

**Fonte de dados:** `external_sales`, metas

**Funcionalidades:**
- Ranking de funcionários por faturamento
- Comparação entre funcionários da mesma empresa

---

### 3.5 Dashboard Previsão

**Rota:** `/dashboard/previsao`  
**API:** `GET /api/dashboard/previsao`

**Fonte de dados:** Histórico de vendas, metas

**Funcionalidades:**
- Projeções otimista, realista e pessimista
- Cenários "bate/não bate" meta
- Salvar projeção e acompanhar vs realizado

---

### 3.6 Dashboard Financeiro

**Rota:** `/dashboard-financeiro`  
**API:** APIs de metas financeiras

**Funcionalidades:**
- Metas por categoria (entradas/saídas)
- Responsáveis por meta

---

### 3.7 Resumo das APIs de Dashboard

| API | Fonte Principal | Agregação |
|-----|-----------------|-----------|
| `/api/dashboard/realizado` | `external_cash_flow` | Por empresa, dia, modo, turno |
| `/api/dashboard/company` | `external_cash_flow` | Por empresa, turno, modo |
| `/api/dashboard/employee` | `external_sales` | Por funcionário, dia, produto |
| `/api/dashboard/team` | `external_sales` | Por funcionário (ranking) |
| `/api/dashboard/companies` | `companies` + mapeamentos | Lista empresas do grupo |

---

## 4. Fluxo de Dados

### 4.1 Do Power BI ao Dashboard Realizado

```
Power BI (CaixaItem) 
  → Sincronização (cash_flow)
  → external_cash_flow (external_company_id, amount, transaction_date)
  → company_mappings (company_id ↔ external_company_id)
  → API realizado: agrupa por empresa, soma amount
  → Gráfico + tabela
```

### 4.2 Do Power BI ao Dashboard Funcionário

```
Power BI (VendaItemGeral)
  → Sincronização (sales)
  → external_sales (external_employee_id, total_value, sale_date, sale_uuid)
  → employee_mappings (employee_id ↔ external_employee_id)
  → API employee: filtra por external_employee_id, SUM(total_value), COUNT(DISTINCT sale_uuid)
  → Gráficos vendas diárias + faturamento mensal
```

### 4.3 Mapeamentos

- **Empresa:** `companies` ↔ `external_companies` via `company_mappings`
- **Funcionário:** `employees` ↔ `external_employees` via `employee_mappings` (código = external_id)
- **Produto:** `products` ↔ `external_products` via `product_mappings` ou `external_product_id` (código)

---

## 5. Tabelas e Mapeamentos

### 5.1 Tabelas External (Sincronizadas)

| Tabela | Campos Principais |
|--------|-------------------|
| `external_sales` | company_group_id, external_id, external_company_id, external_employee_id, sale_date, total_value, sale_uuid, venda_id |
| `external_cash_flow` | company_group_id, external_id, external_company_id, external_employee_id, transaction_date, amount, period |
| `external_companies` | company_group_id, external_id, name |
| `external_employees` | company_group_id, external_id, name |
| `external_products` | company_group_id, external_id, name |
| `external_stock` | company_group_id, external_product_id, external_company_id, quantity |

### 5.2 Tabelas de Mapeamento

| Tabela | Relaciona |
|--------|-----------|
| `company_mappings` | company_id ↔ external_company_id (UUID) |
| `employee_mappings` | employee_id ↔ external_employee_id (UUID do external_employees) |
| `external_employees` | external_id = código (ex: "001") usado em external_sales |
| `external_companies` | external_id = código (ex: "01", "03") usado em external_cash_flow |

### 5.3 Diferença: external_sales vs external_cash_flow

- **external_sales:** Dados de **vendas** (itens de venda). Usado no dashboard de **funcionário** e **equipe**. Granularidade: linha de venda.
- **external_cash_flow:** Dados de **caixa** (entradas/saídas). Usado no dashboard **realizado** e **empresa**. Granularidade: transação de caixa.

Ambos podem coexistir. O dashboard realizado usa `external_cash_flow` por ser a fonte de faturamento consolidado por empresa/filial.

---

## Referências

- **Sincronização detalhada:** `docs/SINCRONIZACAO_POWERBI_COMPLETA.md`
- **Sincronização resumida:** `docs/SINCRONIZACAO_POWERBI.md`
- **APIs e páginas:** `docs/SINCRONIZACAO_APIS_E_PAGINAS.md`

---

*Última atualização: Fevereiro 2025*
