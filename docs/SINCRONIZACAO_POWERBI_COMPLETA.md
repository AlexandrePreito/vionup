# 📊 Documentação Completa - Módulo de Sincronização Power BI

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura do Sistema](#arquitetura-do-sistema)
3. [Estrutura de Tabelas](#estrutura-de-tabelas)
4. [Fluxo de Sincronização](#fluxo-de-sincronização)
5. [Configurações](#configurações)
6. [Queries DAX](#queries-dax)
7. [Mudanças Recentes](#mudanças-recentes)
8. [Erros Comuns e Soluções](#erros-comuns-e-soluções)
9. [Otimizações e Melhorias](#otimizações-e-melhorias)
10. [Troubleshooting](#troubleshooting)

---

## 🎯 Visão Geral

O módulo de sincronização Power BI é responsável por importar dados do Power BI para o banco de dados Supabase, permitindo que o sistema trabalhe com dados atualizados de vendas, caixa, produtos, funcionários e empresas.

### Funcionalidades Principais

- ✅ Sincronização incremental (últimos X dias)
- ✅ Sincronização completa (recarrega período)
- ✅ Processamento em fila (queue-based)
- ✅ Processamento por lotes de dias
- ✅ Cache de tokens Power BI
- ✅ Retry automático em caso de erro
- ✅ Adaptação automática de queries DAX
- ✅ Deduplicação de registros
- ✅ Logs detalhados de sincronização

---

## 🏗️ Arquitetura do Sistema

### Componentes Principais

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  /powerbi/sincronizacao (Interface de Controle)      │   │
│  │  - Visualização de configurações                     │   │
│  │  - Iniciar/Parar sincronizações                      │   │
│  │  - Monitoramento de fila                             │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Routes (Next.js)                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  /api/powerbi/sync-queue (Gerenciar Fila)            │   │
│  │  - POST: Adicionar item à fila                        │   │
│  │  - GET: Listar itens da fila                          │   │
│  │  - DELETE: Remover item da fila                       │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  /api/powerbi/sync-queue/process (Processar Item)    │   │
│  │  - Buscar token Power BI (com cache)                 │   │
│  │  - Executar query DAX                                 │   │
│  │  - Transformar dados                                 │   │
│  │  - Salvar no Supabase                                 │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Power BI API                              │
│  - Autenticação OAuth2                                       │
│  - Execute Queries (DAX)                                     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Supabase (PostgreSQL)                     │
│  - sync_queue (Fila de processamento)                       │
│  - powerbi_connections (Conexões)                           │
│  - powerbi_sync_configs (Configurações)                     │
│  - external_* (Dados sincronizados)                         │
└─────────────────────────────────────────────────────────────┘
```

### Fluxo de Dados

1. **Usuário inicia sincronização** → Frontend chama `/api/powerbi/sync-queue` (POST)
2. **Item adicionado à fila** → Registro criado em `sync_queue`
3. **Processamento automático** → Frontend chama `/api/powerbi/sync-queue/process` (POST)
4. **Busca token Power BI** → Cache verificado, novo token se necessário
5. **Executa query DAX** → Power BI API retorna dados
6. **Transforma dados** → Mapeia campos do Power BI para estrutura do banco
7. **Deduplica registros** → Remove duplicados por `external_id`
8. **Salva no Supabase** → Edge Function ou upsert direto
9. **Atualiza progresso** → Atualiza `sync_queue` com progresso
10. **Próximo dia** → Repete até completar todos os dias

---

## 🗄️ Estrutura de Tabelas

### Tabelas de Controle

#### `powerbi_connections`
Armazena as conexões com Power BI.

```sql
CREATE TABLE powerbi_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_group_id UUID NOT NULL REFERENCES company_groups(id),
  name VARCHAR(255) NOT NULL,
  tenant_id VARCHAR(255) NOT NULL,
  client_id VARCHAR(255) NOT NULL,
  client_secret TEXT NOT NULL,
  workspace_id VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMP,
  sync_status VARCHAR(50),
  sync_error TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Campos importantes:**
- `tenant_id`: ID do tenant Azure AD
- `client_id` / `client_secret`: Credenciais da aplicação Azure AD
- `workspace_id`: ID do workspace no Power BI

#### `powerbi_sync_configs`
Armazena as configurações de sincronização para cada entidade.

```sql
CREATE TABLE powerbi_sync_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES powerbi_connections(id),
  entity_type VARCHAR(50) NOT NULL, -- 'sales', 'cash_flow', 'products', etc.
  dataset_id VARCHAR(255) NOT NULL,
  dax_query TEXT NOT NULL, -- Query DAX completa
  field_mapping JSONB NOT NULL, -- Mapeamento de campos
  is_active BOOLEAN DEFAULT true,
  sync_interval_minutes INTEGER DEFAULT 60,
  last_sync_at TIMESTAMP,
  last_sync_count INTEGER,
  sync_error TEXT,
  -- Campos incrementais
  date_field VARCHAR(255), -- Campo de data no Power BI
  initial_date DATE, -- Data inicial para sincronização
  incremental_days INTEGER, -- Quantos dias para sincronização incremental
  is_incremental BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Tipos de entidade suportados:**
- `products` - Produtos
- `employees` - Funcionários
- `companies` - Empresas
- `sales` - Vendas
- `cash_flow` - Caixa
- `cash_flow_statement` - Fluxo de Caixa (DFC)
- `categories` - Categorias
- `stock` - Estoque

#### `sync_queue`
Fila de processamento de sincronizações.

```sql
CREATE TABLE sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES powerbi_connections(id),
  config_id UUID NOT NULL REFERENCES powerbi_sync_configs(id),
  company_group_id UUID NOT NULL REFERENCES company_groups(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  sync_type VARCHAR(50) NOT NULL, -- 'full', 'incremental', 'initial'
  status VARCHAR(50) NOT NULL, -- 'pending', 'processing', 'completed', 'failed', 'cancelled'
  total_days INTEGER NOT NULL,
  processed_days INTEGER DEFAULT 0,
  processed_records INTEGER DEFAULT 0,
  current_date DATE,
  batch_size INTEGER DEFAULT 1,
  error_message TEXT,
  started_at TIMESTAMP,
  finished_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Status possíveis:**
- `pending` - Aguardando processamento
- `processing` - Em processamento
- `completed` - Concluído com sucesso
- `failed` - Falhou
- `cancelled` - Cancelado pelo usuário

**Tipos de sincronização:**
- `full` - Completa (deleta e reinsere)
- `incremental` - Incremental (últimos X dias, não deleta)
- `initial` - Inicial (primeira sincronização)

### Tabelas de Dados Sincronizados

#### `external_sales`
Vendas sincronizadas do Power BI.

```sql
CREATE TABLE external_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_group_id UUID NOT NULL REFERENCES company_groups(id),
  external_id VARCHAR(255) NOT NULL, -- ID único do Power BI
  external_company_id VARCHAR(255),
  external_employee_id VARCHAR(255),
  venda_id VARCHAR(255), -- ID da venda (pode ser diferente de external_id)
  sale_date DATE NOT NULL,
  product_code VARCHAR(255),
  sale_mode VARCHAR(255),
  period VARCHAR(50), -- 'Almoço', 'Jantar', etc.
  quantity DECIMAL(10,2) NOT NULL,
  total_value DECIMAL(10,2) NOT NULL,
  cost DECIMAL(10,2),
  raw_data JSONB, -- Dados brutos do Power BI
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(company_group_id, external_id)
);
```

#### `external_cash_flow`
Fluxo de caixa sincronizado do Power BI.

```sql
CREATE TABLE external_cash_flow (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_group_id UUID NOT NULL REFERENCES company_groups(id),
  external_id VARCHAR(255) NOT NULL,
  external_employee_id VARCHAR(255),
  external_company_id VARCHAR(255),
  transaction_date DATE NOT NULL,
  payment_method VARCHAR(255),
  transaction_type VARCHAR(255),
  transaction_mode VARCHAR(255),
  period VARCHAR(50), -- 'Almoço', 'Jantar', etc. (pode não existir em todos os modelos)
  amount DECIMAL(10,2) NOT NULL,
  raw_data JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(company_group_id, external_id)
);
```

**Nota sobre `period`:** Este campo é adaptável. Se o modelo Power BI não tiver a coluna `Periodo`, o sistema detecta automaticamente e remove da query DAX.

---

## 🔄 Fluxo de Sincronização

### 1. Início da Sincronização

**Frontend:** Usuário clica em "Sincronizar" (verde = incremental, azul = completa)

**API:** `POST /api/powerbi/sync-queue`

```json
{
  "config_id": "uuid",
  "start_date": "2025-01-01",
  "end_date": "2025-01-31",
  "sync_type": "incremental" // ou "full"
}
```

**Processo:**
1. Valida configuração
2. Calcula total de dias
3. Cria registro em `sync_queue` com status `pending`
4. Retorna `queue_id`

### 2. Processamento

**API:** `POST /api/powerbi/sync-queue/process`

**Fluxo detalhado:**

#### 2.1. Buscar Item da Fila
```typescript
const queueItem = await supabaseAdmin
  .from('sync_queue')
  .select('*')
  .eq('id', queue_id)
  .single();
```

#### 2.2. Calcular Próximo Batch
- Processa **1 dia por vez** (evita timeout)
- Calcula `batchStartDate` e `batchEndDate`
- Atualiza `processed_days`

#### 2.3. Buscar Token Power BI
```typescript
const access_token = await getPowerBIToken(config.connection);
```

**Cache de Token:**
- Cache global em memória
- Validade: 50 minutos (token expira em 1h, margem de 10min)
- Chave: `client_id` da conexão

#### 2.4. Construir Query DAX

**Se `config.dax_query` existe:**
- Usa query do config
- Adiciona filtro de data automaticamente
- Adiciona `TOPN(2000)` se não tiver

**Se não existe (fallback):**
- Gera query padrão para vendas
- Usa `VendaItemGeral` como tabela

**Adaptação de Colunas:**
- Se erro sobre `Periodo` não existir → Remove automaticamente e tenta novamente
- Funciona para `Caixa[Periodo]` ou `CaixaItem[Periodo]`

#### 2.5. Executar Query no Power BI

```typescript
const queryResponse = await Promise.race([
  fetch(`https://api.powerbi.com/v1.0/myorg/groups/${workspace_id}/datasets/${dataset_id}/executeQueries`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${access_token}`
    },
    body: JSON.stringify({
      queries: [{ query: daxQuery }],
      serializerSettings: { includeNulls: true }
    })
  }),
  new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Timeout: Query demorou mais de 300 segundos')), 300000)
  )
]);
```

**Timeout:** 300 segundos (5 minutos)

#### 2.6. Tratamento de Erros

**Erro de Coluna Inexistente (ex: Periodo):**
```typescript
if (isPeriodoError && config.entity_type === 'cash_flow') {
  const daxQueryWithoutPeriodo = removePeriodoFromQuery(daxQuery);
  // Tenta novamente sem Periodo
}
```

**Erro de Timeout:**
- Retorna status `day_error`
- Item pode ser reprocessado

#### 2.7. Transformar Dados

```typescript
const transformedRecords = rows.map((row: any) => 
  transformRecord(row, config, companyGroupId)
);
```

**Função `transformRecord`:**
- Mapeia campos do Power BI para estrutura do banco
- Gera `external_id` único
- Valida campos obrigatórios
- Limpa e formata dados

#### 2.8. Deduplicação

```typescript
const uniqueRecords = Array.from(
  new Map(
    transformedRecords.map(record => [record.external_id, record])
  ).values()
);
```

Remove duplicados baseado em `external_id`.

#### 2.9. Salvar no Supabase

**Via Edge Function (preferencial):**
```typescript
await fetch(`${SUPABASE_URL}/functions/v1/super-action`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
  },
  body: JSON.stringify({
    action: 'save_records',
    records: uniqueRecords,
    entity_type: config.entity_type
  })
});
```

**Fallback (se Edge Function falhar):**
```typescript
await supabaseAdmin
  .from(getTableName(config.entity_type))
  .upsert(uniqueRecords, {
    onConflict: 'company_group_id,external_id'
  });
```

**Batch Size:** 200 registros por vez

#### 2.10. Atualizar Progresso

```typescript
await supabaseAdmin
  .from('sync_queue')
  .update({
    processed_days: newProcessedDays,
    processed_records: newProcessedRecords,
    progress: Math.round((newProcessedDays / totalDays) * 100)
  })
  .eq('id', queueItem.id);
```

### 3. Finalização

**Quando todos os dias são processados:**
```typescript
await supabaseAdmin.rpc('finish_sync_queue_item', {
  p_queue_id: queueItem.id,
  p_status: 'completed',
  p_total_records: totalRecords,
  p_error_message: null
});
```

---

## ⚙️ Configurações

### Interface de Configuração

**Localização:** `/powerbi/sincronizacao`

**Campos do Formulário:**

1. **Dataset** (obrigatório)
   - Seleciona dataset do Power BI

2. **Nome da Tabela** (obrigatório)
   - Ex: `VendaItemGeral`, `CaixaItem`, etc.

3. **Query DAX** (opcional)
   - Se preenchido, usa esta query
   - Se vazio, gera automaticamente baseado no mapeamento

4. **Mapeamento de Campos**
   - Para cada campo do sistema, mapeia para coluna do Power BI
   - Campos com 📊 aceitam medidas DAX (ex: `[Vendas Valor]`, `SUM(Valor)`)

5. **Sincronização Incremental**
   - ✅ Ativado: Sincroniza últimos X dias (não deleta)
   - ❌ Desativado: Sincronização completa (deleta e reinsere)

6. **Campo de Data** (se incremental)
   - Campo no Power BI que contém a data
   - Ex: `dt_contabil`, `DataVenda`

7. **Data Inicial** (se incremental)
   - Data a partir da qual sincronizar
   - Ex: `2025-01-01`

8. **Dias Incremental** (se incremental)
   - Quantos dias para sincronização incremental
   - Ex: `7` = últimos 7 dias

### Exemplo de Configuração - Caixa

**Query DAX:**
```dax
SUMMARIZECOLUMNS(
    CaixaItem[idCaixa],
    CaixaItem[CodigoFuncionario],
    CaixaItem[Empresa],
    CaixaItem[dt_contabil],
    CaixaItem[meio_nome],
    CaixaItem[tipo],
    CaixaItem[modo_venda],
    CaixaItem[Periodo],
    "valor", [Caixa]
)
```

**Mapeamento:**
- `external_id` → `idCaixa`
- `external_employee_id` → `CodigoFuncionario`
- `external_company_id` → `Empresa`
- `transaction_date` → `dt_contabil`
- `payment_method` → `meio_nome`
- `transaction_type` → `tipo`
- `transaction_mode` → `modo_venda`
- `period` → `Periodo` (adaptável)
- `amount` → `[Caixa]` (medida DAX)

---

## 📝 Queries DAX

### Estrutura Padrão

```dax
EVALUATE TOPN(
  2000,
  FILTER(
    SUMMARIZECOLUMNS(
      Tabela[Campo1],
      Tabela[Campo2],
      "medida1", [Medida1],
      "medida2", [Medida2]
    ),
    Tabela[Data] >= DATE(2025, 1, 1) && 
    Tabela[Data] <= DATE(2025, 1, 31)
  )
)
```

### Query para Vendas

```dax
EVALUATE TOPN(
  2000,
  FILTER(
    SUMMARIZECOLUMNS(
      VendaItemGeral[Empresa],
      VendaItemGeral[idVenda],
      VendaItemGeral[venda_id],
      VendaItemGeral[dt_contabil],
      VendaItemGeral[CodigoMaterial],
      VendaItemGeral[modo_venda_descr],
      VendaItemGeral[CodigoFuncionario],
      "cost", [CMV],
      "quantity", [Quantidades],
      "total_value", [Vendas Valor]
    ),
    VendaItemGeral[dt_contabil] >= DATE(2025, 1, 1) && 
    VendaItemGeral[dt_contabil] <= DATE(2025, 1, 31)
  )
)
```

### Query para Caixa (Adaptável)

**Com Periodo:**
```dax
SUMMARIZECOLUMNS(
    CaixaItem[idCaixa],
    CaixaItem[CodigoFuncionario],
    CaixaItem[Empresa],
    CaixaItem[dt_contabil],
    CaixaItem[meio_nome],
    CaixaItem[tipo],
    CaixaItem[modo_venda],
    CaixaItem[Periodo],
    "valor", [Caixa]
)
```

**Sem Periodo (adaptação automática):**
```dax
SUMMARIZECOLUMNS(
    CaixaItem[idCaixa],
    CaixaItem[CodigoFuncionario],
    CaixaItem[Empresa],
    CaixaItem[dt_contabil],
    CaixaItem[meio_nome],
    CaixaItem[tipo],
    CaixaItem[modo_venda],
    "valor", [Caixa]
)
```

### Limites e Otimizações

- **TOPN(2000):** Limita a 2000 registros por dia (reduzido de 5000 para evitar timeout)
- **1 dia por vez:** Processa um dia de cada vez (evita timeout)
- **Timeout:** 300 segundos (5 minutos) por query

---

## 🔄 Mudanças Recentes

### 1. Sistema de Fila (Queue-Based)

**Antes:** Sincronização síncrona, bloqueava interface

**Agora:** Sistema de fila assíncrono
- Itens processados em background
- Múltiplas sincronizações podem ser enfileiradas
- Progresso em tempo real

**Arquivos:**
- `src/app/api/powerbi/sync-queue/route.ts` - Gerenciar fila
- `src/app/api/powerbi/sync-queue/process/route.ts` - Processar itens

### 2. Cache de Tokens Power BI

**Antes:** Token buscado a cada requisição

**Agora:** Cache global em memória
- Validade: 50 minutos
- Reduz chamadas à API do Azure AD
- Melhora performance

**Implementação:**
```typescript
const tokenCache = new Map<string, { token: string; expires: number }>();
```

### 3. Processamento por Lotes de Dias

**Antes:** Processava todos os dias de uma vez

**Agora:** Processa 1 dia por vez
- Evita timeout
- Progresso mais granular
- Melhor controle de erros

**Configuração:**
```typescript
const DAYS_PER_BATCH = 1; // Fixo em 1 dia
```

### 4. Deduplicação de Registros

**Antes:** Podia salvar registros duplicados

**Agora:** Remove duplicados antes de salvar
- Baseado em `external_id`
- Logs de quantos duplicados foram removidos

**Implementação:**
```typescript
const uniqueRecords = Array.from(
  new Map(
    transformedRecords.map(record => [record.external_id, record])
  ).values()
);
```

### 5. Retry com Fallback

**Antes:** Se Edge Function falhasse, perdia todo o lote

**Agora:** Retry automático + fallback para Supabase direto
- 3 tentativas na Edge Function
- Se falhar, salva direto no Supabase
- Não perde dados

### 6. Adaptação Automática de Queries DAX

**Antes:** Erro se coluna não existisse (ex: `Periodo`)

**Agora:** Detecta erro e tenta sem a coluna
- Específico para `cash_flow` e coluna `Periodo`
- Remove automaticamente e tenta novamente
- Funciona em modelos com e sem `Periodo`

**Implementação:**
```typescript
if (isPeriodoError && config.entity_type === 'cash_flow') {
  const daxQueryWithoutPeriodo = removePeriodoFromQuery(daxQuery);
  // Retry sem Periodo
}
```

### 7. Timeout Aumentado

**Antes:** 60 segundos

**Agora:** 300 segundos (5 minutos)
- Suporta queries mais pesadas
- Melhor para dias com muitos dados

### 8. TOPN Reduzido

**Antes:** TOPN(5000)

**Agora:** TOPN(2000)
- Reduz tempo de processamento
- Evita timeout em dias pesados

### 9. Campo Query DAX Editável

**Antes:** Query gerada automaticamente apenas

**Agora:** Campo para editar query DAX manualmente
- Interface em `/powerbi/sincronizacao`
- Se preenchido, usa query manual
- Se vazio, gera automaticamente

### 10. Limpeza de Fila

**Nova funcionalidade:**
- Remove itens antigos (completed/failed/cancelled) com mais de 30 dias
- Botão na interface para limpar
- Mantém fila organizada

---

## ⚠️ Erros Comuns e Soluções

### 1. Erro: "Column 'Periodo' cannot be found"

**Causa:** Modelo Power BI não tem coluna `Periodo`

**Solução:** Sistema adapta automaticamente
- Detecta erro
- Remove `Periodo` da query
- Tenta novamente

**Se persistir:**
- Verifique se o nome da tabela está correto (`Caixa` vs `CaixaItem`)
- Atualize a query DAX manualmente removendo `Periodo`

### 2. Erro: "Timeout: Query demorou mais de 300 segundos"

**Causa:** Query muito pesada ou muitos dados no dia

**Soluções:**
- ✅ Reduzir TOPN (já em 2000)
- ✅ Processar 1 dia por vez (já implementado)
- ✅ Verificar se há índices no Power BI
- ✅ Otimizar query DAX

**Temporário:**
- Pular dias problemáticos
- Processar manualmente em períodos menores

### 3. Erro: "fetch failed"

**Causa:** Problema de rede ou Power BI API indisponível

**Soluções:**
- Verificar conexão com internet
- Verificar status do Power BI
- Verificar se token está válido
- Tentar novamente (sistema tem retry)

### 4. Erro: "Token não retornado"

**Causa:** Credenciais Azure AD inválidas

**Soluções:**
- Verificar `client_id` e `client_secret`
- Verificar se aplicação Azure AD está ativa
- Verificar permissões no Power BI

### 5. Erro: "Query DAX não encontrada na configuração"

**Causa:** Configuração sem query DAX

**Soluções:**
- Preencher campo "Query DAX" na configuração
- Ou preencher mapeamento de campos (gera automaticamente)

### 6. Erro: "Campos obrigatórios não encontrados"

**Causa:** Mapeamento de campos incompleto

**Soluções:**
- Verificar se todos os campos obrigatórios estão mapeados
- Verificar se nomes das colunas estão corretos
- Verificar se medidas DAX estão corretas

### 7. Sincronização "travando"

**Causa:** Loop infinito ou polling muito frequente

**Soluções implementadas:**
- ✅ Uso de `useRef` para evitar loops
- ✅ Limite de tentativas (1000)
- ✅ Polling otimizado (100ms)
- ✅ Timeout em todas as chamadas

### 8. Registros duplicados

**Causa:** `external_id` não único

**Soluções implementadas:**
- ✅ Deduplicação antes de salvar
- ✅ Verificar geração de `external_id`
- ✅ Usar campos únicos do Power BI quando disponível

---

## 🚀 Otimizações e Melhorias

### Performance

1. **Cache de Tokens**
   - Reduz chamadas à API Azure AD
   - Melhora tempo de resposta

2. **Processamento em Lotes**
   - 1 dia por vez evita timeout
   - Progresso granular

3. **Deduplicação Eficiente**
   - Usa `Map` para O(1) lookup
   - Remove antes de salvar (economiza I/O)

4. **Batch Size Otimizado**
   - 200 registros por upsert
   - Balanceia performance e memória

### Confiabilidade

1. **Retry com Fallback**
   - 3 tentativas na Edge Function
   - Fallback para Supabase direto
   - Não perde dados

2. **Tratamento de Erros Robusto**
   - Detecta erros específicos
   - Adapta queries automaticamente
   - Logs detalhados

3. **Timeout Configurável**
   - 300 segundos (5 minutos)
   - Suporta queries pesadas

### Usabilidade

1. **Interface de Configuração Intuitiva**
   - Campo Query DAX editável
   - Validação em tempo real
   - Mensagens de erro claras

2. **Monitoramento em Tempo Real**
   - Progresso visual
   - Fila de sincronizações
   - Logs detalhados

3. **Limpeza Automática**
   - Remove itens antigos
   - Mantém fila organizada

---

## 🔧 Troubleshooting

### Verificar Status da Sincronização

```sql
SELECT 
  sq.id,
  sq.status,
  sq.sync_type,
  sq.processed_days,
  sq.total_days,
  sq.processed_records,
  sq.error_message,
  sq.created_at,
  sc.entity_type,
  sc.dax_query
FROM sync_queue sq
INNER JOIN powerbi_sync_configs sc ON sq.config_id = sc.id
WHERE sq.status IN ('processing', 'pending', 'failed')
ORDER BY sq.created_at DESC;
```

### Verificar Configurações

```sql
SELECT 
  id,
  entity_type,
  dataset_id,
  is_active,
  is_incremental,
  incremental_days,
  date_field,
  initial_date,
  LEFT(dax_query, 200) as dax_preview
FROM powerbi_sync_configs
WHERE is_active = true
ORDER BY entity_type;
```

### Verificar Dados Sincronizados

```sql
-- Vendas
SELECT 
  COUNT(*) as total,
  MIN(sale_date) as data_inicial,
  MAX(sale_date) as data_final
FROM external_sales
WHERE company_group_id = 'SEU_GROUP_ID';

-- Caixa
SELECT 
  COUNT(*) as total,
  MIN(transaction_date) as data_inicial,
  MAX(transaction_date) as data_final
FROM external_cash_flow
WHERE company_group_id = 'SEU_GROUP_ID';
```

### Limpar Fila Manualmente

```sql
-- Remover itens antigos (mais de 30 dias)
DELETE FROM sync_queue
WHERE status IN ('completed', 'failed', 'cancelled')
  AND created_at < NOW() - INTERVAL '30 days';

-- Cancelar todos os itens em processamento (CUIDADO!)
UPDATE sync_queue
SET status = 'cancelled'
WHERE status = 'processing';
```

### Atualizar Query DAX Manualmente

```sql
UPDATE powerbi_sync_configs
SET dax_query = 'SUA_QUERY_DAX_AQUI',
    updated_at = NOW()
WHERE id = 'CONFIG_ID';
```

### Verificar Token Cache

O cache de tokens é em memória. Para limpar:
- Reiniciar servidor Next.js
- Ou aguardar expiração (50 minutos)

---

## 📚 Referências

### Arquivos Principais

- `src/app/(dashboard)/powerbi/sincronizacao/page.tsx` - Interface
- `src/app/api/powerbi/sync-queue/route.ts` - Gerenciar fila
- `src/app/api/powerbi/sync-queue/process/route.ts` - Processar itens
- `src/app/api/powerbi/sync-configs/route.ts` - Configurações
- `src/types/index.ts` - Tipos TypeScript

### Scripts SQL Úteis

- `check_cash_flow_config.sql` - Verificar configuração de caixa
- `fix_cash_flow_dax_query.sql` - Corrigir query DAX de caixa
- `update_cash_flow_dax_query.sql` - Atualizar query DAX

### Documentação Externa

- [Power BI REST API](https://learn.microsoft.com/en-us/rest/api/power-bi/)
- [DAX Query Syntax](https://learn.microsoft.com/en-us/dax/)
- [Azure AD OAuth2](https://learn.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-client-creds-grant-flow)

---

## 📝 Notas Finais

### Boas Práticas

1. **Sempre teste queries DAX no Power BI Desktop antes de configurar**
2. **Use sincronização incremental para dados transacionais (vendas, caixa)**
3. **Use sincronização completa apenas quando necessário (reprocessar período)**
4. **Monitore a fila regularmente e limpe itens antigos**
5. **Mantenha logs de erros para troubleshooting**

### Limitações Conhecidas

1. **Processa 1 dia por vez** - Pode ser lento para muitos dias
2. **TOPN(2000)** - Limita a 2000 registros por dia
3. **Timeout de 5 minutos** - Queries muito pesadas podem falhar
4. **Cache de token em memória** - Perdido ao reiniciar servidor

### Melhorias Futuras

1. ⏳ Processamento paralelo de múltiplos dias
2. ⏳ Cache de token persistente (Redis)
3. ⏳ Retry inteligente com backoff exponencial
4. ⏳ Métricas e alertas de sincronização
5. ⏳ Interface para visualizar logs em tempo real

---

**Última atualização:** Janeiro 2025  
**Versão:** 2.0  
**Autor:** Sistema Vion Up!
