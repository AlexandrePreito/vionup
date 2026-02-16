# Sincronização Power BI — Telas, APIs e Cron

Documentação do fluxo de sincronização: caminho das telas, APIs e configuração do cron automático.

---

## 1. Caminho das Telas

### Fluxo de navegação

```
/powerbi/conexoes          →  Conexões Power BI (cadastro de tenant, client_id, workspace)
         │
         ▼
/powerbi/sincronizacao     →  Tela principal de Sincronização
         │                     • Configurar entidades (vendas, caixa, produtos, etc.)
         │                     • Iniciar sync manual (incremental/completa)
         │                     • Criar agendamentos (diário/semanal)
         │                     • Ver fila e logs
         │                     • Importar planilha
```

### Detalhamento das rotas

| Rota | Arquivo | Descrição |
|------|---------|-----------|
| `/powerbi/conexoes` | `src/app/(dashboard)/powerbi/conexoes/page.tsx` | CRUD de conexões Power BI por grupo (tenant_id, client_id, client_secret, workspace_id) |
| `/powerbi/sincronizacao` | `src/app/(dashboard)/powerbi/sincronizacao/page.tsx` | Tela principal: configs, fila, agendamentos, logs, importação |
| `/dashboard/importar` | `src/app/(dashboard)/dashboard/importar/page.tsx` | Importação via Goomer (NPS, comentários) — não faz parte do fluxo Power BI |

### Acesso no menu

- **Sidebar:** Power BI → Conexões | Sincronização
- **Mobile:** grupo Importar → Conexões, Sincronização

---

## 2. Caminho das APIs

### Visão geral do fluxo

```
┌──────────────────────────────────────────────────────────────────────┐
│                         CRON (Vercel)                                  │
│  GET /api/powerbi/cron/run-schedules  (a cada 5 min)                 │
│         │                                                              │
│         ▼  insere itens na fila                                        │
└──────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────────────┐
│  sync_queue (tabela Supabase)                                         │
│  status: pending → processing → completed / failed                     │
└──────────────────────────────────────────────────────────────────────┘
         │
         │  Frontend faz polling ou usuário inicia manualmente
         ▼
┌──────────────────────────────────────────────────────────────────────┐
│  POST /api/powerbi/sync-queue/process                                 │
│  • Busca próximo item (get_next_sync_queue_item)                      │
│  • Obtém token Power BI (auth.ts)                                     │
│  • Executa query DAX                                                  │
│  • Grava no Supabase (external_sales, external_cash_flow, etc.)       │
└──────────────────────────────────────────────────────────────────────┘
```

### APIs por categoria

#### Conexões Power BI

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/powerbi/connections` | Listar conexões |
| POST | `/api/powerbi/connections` | Criar conexão |
| GET | `/api/powerbi/connections/[id]` | Obter conexão |
| PATCH | `/api/powerbi/connections/[id]` | Atualizar conexão |
| DELETE | `/api/powerbi/connections/[id]` | Excluir conexão |
| POST | `/api/powerbi/connections/[id]/test` | Testar conexão |

#### Configurações de sincronização

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/powerbi/sync-configs` | Listar configs (`?connection_id=`) |
| POST | `/api/powerbi/sync-configs` | Criar configuração |
| PATCH | `/api/powerbi/sync-configs/[id]` | Atualizar configuração |
| DELETE | `/api/powerbi/sync-configs/[id]` | Excluir configuração |
| POST | `/api/powerbi/sync-configs/[id]/clear-data` | Limpar dados da entidade |

#### Fila de sincronização

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/powerbi/sync-queue` | Listar itens da fila |
| POST | `/api/powerbi/sync-queue` | Adicionar item (`config_id`, `sync_type`, `start_date`, `end_date`) |
| DELETE | `/api/powerbi/sync-queue?id=[id]` | Remover item |
| DELETE | `/api/powerbi/sync-queue?id=&action=cleanup` | Limpar itens finalizados |
| POST | `/api/powerbi/sync-queue/process` | Processar próximo item da fila |
| POST | `/api/powerbi/sync-queue/test-query` | Testar query DAX |

#### Agendamentos

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/powerbi/schedules` | Listar agendamentos (`?config_id=`) |
| POST | `/api/powerbi/schedules` | Criar agendamento |
| PATCH | `/api/powerbi/schedules/[id]` | Atualizar agendamento |
| DELETE | `/api/powerbi/schedules/[id]` | Excluir agendamento |

#### Cron

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/powerbi/cron/run-schedules` | Executar agendamentos vencidos (chamado pelo Vercel Cron) |

#### Logs e estatísticas

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/powerbi/sync` | Logs (`?config_id=`, `?limit=`) |
| GET | `/api/powerbi/sync-stats` | Estatísticas (`?config_id=`) |

---

## 3. Cron — Funcionamento e Configuração

### 3.1 O que é o Cron

O **Vercel Cron** chama automaticamente a API `GET /api/powerbi/cron/run-schedules` em intervalos definidos. Essa API:

1. Busca agendamentos em `powerbi_sync_schedules` com `is_active = true` e `next_run_at <= agora`
2. Para cada agendamento no horário:
   - Insere um item na `sync_queue` (tipo incremental ou full conforme a config)
   - Atualiza `next_run_at` para o próximo dia (diário) ou semana (semanal)
3. A fila é processada pelo frontend (polling) ou por outro disparador

### 3.2 Configuração no projeto

**Arquivo `vercel.json`:**

```json
{
  "crons": [
    {
      "path": "/api/powerbi/cron/run-schedules",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

- **path:** Endpoint chamado pelo Vercel
- **schedule:** Expressão cron — `*/5 * * * *` = a cada **5 minutos**

### 3.3 Segurança (CRON_SECRET)

A API exige o header:

```
Authorization: Bearer <CRON_SECRET>
```

- O Vercel envia automaticamente esse header quando chama o cron
- A variável `CRON_SECRET` deve ser configurada no **Vercel Dashboard** (Settings → Environment Variables)
- Valor mínimo: **16 caracteres**

```bash
# Gerar chave (exemplo)
openssl rand -hex 16
```

### 3.4 Fluxo detalhado do Cron

```
Vercel (a cada 5 min)
    │
    │  GET /api/powerbi/cron/run-schedules
    │  Authorization: Bearer <CRON_SECRET>
    │
    ▼
┌─────────────────────────────────────────────────────┐
│ 1. Validar CRON_SECRET                              │
│ 2. SELECT * FROM powerbi_sync_schedules            │
│    WHERE is_active = true AND next_run_at <= now()  │
└─────────────────────────────────────────────────────┘
    │
    ▼
Para cada agendamento vencido:
┌─────────────────────────────────────────────────────┐
│ 3. Buscar powerbi_sync_configs (connection, tipo)   │
│ 4. Se já existe item pending/processing → skip      │
│ 5. INSERT INTO sync_queue (config_id, sync_type,    │
│    start_date, end_date, status='pending')          │
│ 6. UPDATE powerbi_sync_schedules SET next_run_at =  │
│    próximo dia ou +7 dias (semanal)                 │
└─────────────────────────────────────────────────────┘
    │
    ▼
Retorna: { ok: true, triggered: N, results: [...] }
```

### 3.5 Processamento da fila

O cron **apenas insere** itens na fila. O processamento é feito por:

1. **Frontend:** A tela `/powerbi/sincronizacao` faz polling em `POST /api/powerbi/sync-queue/process`
2. **Funcionamento:** O frontend chama a API em loop enquanto houver itens `pending`

### 3.6 Requisitos no Vercel

| Item | Status |
|------|--------|
| API `/api/powerbi/cron/run-schedules` | ✅ Implementada |
| `vercel.json` com cron | ✅ `*/5 * * * *` (5 min) |
| Variável `CRON_SECRET` | ⚠️ Configurar no Dashboard (≥ 16 caracteres) |
| Plano Vercel | ⚠️ **Pro** ou superior para Cron em produção |

### 3.7 Testar o Cron manualmente

```bash
curl -H "Authorization: Bearer SEU_CRON_SECRET" \
  "https://SEU_DOMINIO.vercel.app/api/powerbi/cron/run-schedules"
```

**Resposta (sem agendamentos no horário):**
```json
{ "ok": true, "triggered": 0, "message": "Nenhum agendamento no horário" }
```

**Resposta (com agendamentos disparados):**
```json
{
  "ok": true,
  "triggered": 2,
  "results": [
    { "scheduleId": "...", "configId": "...", "status": "queued" },
    { "scheduleId": "...", "configId": "...", "status": "skipped", "detail": "Já existe sync pendente" }
  ]
}
```

### 3.8 Timezone

- O Vercel executa o cron em **UTC**
- O campo `next_run_at` é armazenado em ISO (UTC)
- Ao criar um agendamento (ex.: "08:00"), o servidor usa o fuso do ambiente; em produção o próximo horário já fica em UTC

---

## 4. Estrutura de arquivos

```
src/
├── app/
│   ├── api/powerbi/
│   │   ├── connections/          # Conexões
│   │   ├── sync-configs/        # Configurações
│   │   ├── sync-queue/          # Fila e processamento
│   │   ├── schedules/           # Agendamentos
│   │   ├── cron/
│   │   │   └── run-schedules/   # ← Endpoint do Cron
│   │   ├── sync/                # Logs
│   │   ├── sync-stats/          # Estatísticas
│   │   └── import-spreadsheet/ # Importar planilha
│   └── (dashboard)/powerbi/
│       ├── conexoes/page.tsx
│       └── sincronizacao/page.tsx
└── lib/powerbi/
    └── auth.ts                  # Token OAuth2, queries DAX
```

---

## 5. Chamadas da tela de Sincronização

| Ação na tela | API |
|--------------|-----|
| Carregar conexões | `GET /api/powerbi/connections` |
| Carregar configs | `GET /api/powerbi/sync-configs?connection_id=` |
| Carregar agendamentos | `GET /api/powerbi/schedules?config_id=` |
| Listar fila | `GET /api/powerbi/sync-queue` |
| Iniciar sincronização | `POST /api/powerbi/sync-queue` |
| Processar fila (polling) | `POST /api/powerbi/sync-queue/process` |
| Cancelar item | `DELETE /api/powerbi/sync-queue?id=` |
| Limpar fila | `DELETE /api/powerbi/sync-queue?id=&action=cleanup` |
| Criar agendamento | `POST /api/powerbi/schedules` |
| Logs | `GET /api/powerbi/sync?config_id=` |
| Estatísticas | `GET /api/powerbi/sync-stats?config_id=` |

---

## Documentos relacionados

- `docs/SINCRONIZACAO_APIS_E_PAGINAS.md` — Referência detalhada de APIs e páginas
- `docs/SINCRONIZACAO_POWERBI_COMPLETA.md` — Arquitetura, tabelas, DAX, troubleshooting
- `docs/VERCEL_CRON_SYNC.md` — Configuração do cron no Vercel
