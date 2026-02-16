# Documentação do Módulo de Sincronização Power BI

## Visão geral

Este documento descreve a localização das **APIs** e **páginas** do módulo de sincronização com Power BI, responsável por importar dados de vendas, caixa, produtos, funcionários e empresas do Power BI para o banco de dados Supabase.

---

## Páginas (Frontend)

| Rota | Arquivo | Descrição |
|------|---------|-----------|
| `/powerbi/sincronizacao` | `src/app/(dashboard)/powerbi/sincronizacao/page.tsx` | **Tela principal de sincronização** – Interface para iniciar sincronizações, monitorar fila, gerenciar configs e agendamentos, ver logs e stats |
| `/powerbi/conexoes` | `src/app/(dashboard)/powerbi/conexoes/page.tsx` | **Conexões Power BI** – CRUD de conexões (tenant, client_id, client_secret, workspace) por grupo |
| `/dashboard/importar` | `src/app/(dashboard)/dashboard/importar/page.tsx` | **Importar dados** – Importação de JSON (NPS, comentários, scores) via Goomer – não faz parte do fluxo Power BI |

### Acesso no menu

- **Mobile:** grupo **Importar** → Sincronização, Conexões
- **Desktop:** menu superior / sidebar conforme layout

---

## APIs (Backend)

### Conexões Power BI

| Método | Endpoint | Arquivo | Descrição |
|--------|----------|---------|-----------|
| GET | `/api/powerbi/connections` | `src/app/api/powerbi/connections/route.ts` | Listar conexões (opcional: `?group_id=`) |
| POST | `/api/powerbi/connections` | `src/app/api/powerbi/connections/route.ts` | Criar conexão |
| GET | `/api/powerbi/connections/[id]` | `src/app/api/powerbi/connections/[id]/route.ts` | Obter conexão por ID |
| PATCH/PUT | `/api/powerbi/connections/[id]` | `src/app/api/powerbi/connections/[id]/route.ts` | Atualizar conexão |
| DELETE | `/api/powerbi/connections/[id]` | `src/app/api/powerbi/connections/[id]/route.ts` | Excluir conexão |
| POST | `/api/powerbi/connections/[id]/test` | `src/app/api/powerbi/connections/[id]/test/route.ts` | Testar conexão (autenticação Power BI) |

---

### Configurações de sincronização

| Método | Endpoint | Arquivo | Descrição |
|--------|----------|---------|-----------|
| GET | `/api/powerbi/sync-configs` | `src/app/api/powerbi/sync-configs/route.ts` | Listar configs (`?connection_id=`, `?group_id=`) |
| POST | `/api/powerbi/sync-configs` | `src/app/api/powerbi/sync-configs/route.ts` | Criar configuração |
| GET | `/api/powerbi/sync-configs/[id]` | `src/app/api/powerbi/sync-configs/[id]/route.ts` | Obter configuração por ID |
| PATCH/PUT | `/api/powerbi/sync-configs/[id]` | `src/app/api/powerbi/sync-configs/[id]/route.ts` | Atualizar configuração |
| DELETE | `/api/powerbi/sync-configs/[id]` | `src/app/api/powerbi/sync-configs/[id]/route.ts` | Excluir configuração |
| POST | `/api/powerbi/sync-configs/[id]/clear-data` | `src/app/api/powerbi/sync-configs/[id]/clear-data/route.ts` | Limpar dados sincronizados da entidade |

---

### Fila de sincronização

| Método | Endpoint | Arquivo | Descrição |
|--------|----------|---------|-----------|
| GET | `/api/powerbi/sync-queue` | `src/app/api/powerbi/sync-queue/route.ts` | Listar itens da fila (`?group_id=`) |
| POST | `/api/powerbi/sync-queue` | `src/app/api/powerbi/sync-queue/route.ts` | Adicionar item à fila (`config_id`, `sync_type`, `start_date`, `end_date`) |
| DELETE | `/api/powerbi/sync-queue?id=[id]` | `src/app/api/powerbi/sync-queue/route.ts` | Remover item da fila |
| DELETE | `/api/powerbi/sync-queue?id=&action=cleanup` | `src/app/api/powerbi/sync-queue/route.ts` | Limpar fila (itens finalizados) |
| POST | `/api/powerbi/sync-queue/process` | `src/app/api/powerbi/sync-queue/process/route.ts` | Processar próximo item da fila (busca token, executa DAX, salva Supabase) |
| POST | `/api/powerbi/sync-queue/test-query` | `src/app/api/powerbi/sync-queue/test-query/route.ts` | Testar query DAX sem gravar dados |

---

### Agendamentos

| Método | Endpoint | Arquivo | Descrição |
|--------|----------|---------|-----------|
| GET | `/api/powerbi/schedules` | `src/app/api/powerbi/schedules/route.ts` | Listar agendamentos (`?config_id=`) |
| POST | `/api/powerbi/schedules` | `src/app/api/powerbi/schedules/route.ts` | Criar agendamento |
| GET | `/api/powerbi/schedules/[id]` | `src/app/api/powerbi/schedules/[id]/route.ts` | Obter agendamento |
| PATCH | `/api/powerbi/schedules/[id]` | `src/app/api/powerbi/schedules/[id]/route.ts` | Atualizar agendamento |
| DELETE | `/api/powerbi/schedules/[id]` | `src/app/api/powerbi/schedules/[id]/route.ts` | Excluir agendamento |
| GET | `/api/powerbi/cron/run-schedules` | `src/app/api/powerbi/cron/run-schedules/route.ts` | Executar agendamentos vencidos (Vercel Cron, exige `Authorization: Bearer CRON_SECRET`) |

---

### Logs e estatísticas

| Método | Endpoint | Arquivo | Descrição |
|--------|----------|---------|-----------|
| GET | `/api/powerbi/sync` | `src/app/api/powerbi/sync/route.ts` | Logs de sincronização (`?config_id=`, `?connection_id=`, `?limit=`) |
| GET | `/api/powerbi/sync-stats` | `src/app/api/powerbi/sync-stats/route.ts` | Estatísticas por config (`?config_id=`) |

---

### Importação de planilha

| Método | Endpoint | Arquivo | Descrição |
|--------|----------|---------|-----------|
| GET | `/api/powerbi/import-spreadsheet` | `src/app/api/powerbi/import-spreadsheet/route.ts` | Listar/preview planilhas disponíveis |
| POST | `/api/powerbi/import-spreadsheet` | `src/app/api/powerbi/import-spreadsheet/route.ts` | Importar planilha Excel/CSV (vendas, caixa, etc.) |

---

## Biblioteca de autenticação Power BI

| Arquivo | Descrição |
|---------|-----------|
| `src/lib/powerbi/auth.ts` | Obtém token OAuth2 do Power BI (com cache em memória), executa queries DAX e busca conexões |

---

## Resumo de chamadas da página de sincronização

A página `sincronizacao/page.tsx` utiliza as seguintes APIs:

| Ação na tela | API chamada |
|--------------|-------------|
| Carregar conexões | `GET /api/powerbi/connections` |
| Testar conexão | `POST /api/powerbi/connections/[id]/test` |
| Carregar configs | `GET /api/powerbi/sync-configs?connection_id=` |
| Carregar agendamentos | `GET /api/powerbi/schedules?config_id=` |
| Listar fila | `GET /api/powerbi/sync-queue` |
| Iniciar sincronização | `POST /api/powerbi/sync-queue` |
| Cancelar item da fila | `DELETE /api/powerbi/sync-queue?id=` |
| Processar fila (polling) | `POST /api/powerbi/sync-queue/process` |
| Limpar fila | `DELETE /api/powerbi/sync-queue?id=&action=cleanup` |
| Importar planilha | `POST /api/powerbi/import-spreadsheet` |
| Logs de um config | `GET /api/powerbi/sync?config_id=` |
| Estatísticas | `GET /api/powerbi/sync-stats?config_id=` |
| Testar query DAX | `POST /api/powerbi/sync-queue/test-query` |
| Criar/editar config | `POST/PATCH /api/powerbi/sync-configs` ou `/[id]` |
| Criar agendamento | `POST /api/powerbi/schedules` |
| Excluir agendamento | `DELETE /api/powerbi/schedules/[id]` |
| Excluir config | `DELETE /api/powerbi/sync-configs/[id]` |
| Limpar dados | `POST /api/powerbi/sync-configs/[id]/clear-data` |

---

## Estrutura de diretórios

```
src/
├── app/
│   ├── api/powerbi/
│   │   ├── connections/
│   │   │   ├── route.ts           # GET, POST
│   │   │   └── [id]/
│   │   │       ├── route.ts       # GET, PATCH, DELETE
│   │   │       └── test/route.ts  # POST
│   │   ├── sync-configs/
│   │   │   ├── route.ts           # GET, POST
│   │   │   └── [id]/
│   │   │       ├── route.ts       # GET, PATCH, DELETE
│   │   │       └── clear-data/route.ts  # POST
│   │   ├── sync-queue/
│   │   │   ├── route.ts           # GET, POST, DELETE
│   │   │   ├── process/route.ts  # POST
│   │   │   └── test-query/route.ts  # POST
│   │   ├── schedules/
│   │   │   ├── route.ts           # GET, POST
│   │   │   └── [id]/route.ts     # GET, PATCH, DELETE
│   │   ├── cron/
│   │   │   └── run-schedules/route.ts  # GET (cron)
│   │   ├── sync/route.ts          # GET (logs)
│   │   ├── sync-stats/route.ts    # GET
│   │   └── import-spreadsheet/route.ts  # GET, POST
│   └── (dashboard)/powerbi/
│       ├── sincronizacao/page.tsx
│       └── conexoes/page.tsx
└── lib/
    └── powerbi/
        └── auth.ts
```

---

## Variáveis de ambiente

- `CRON_SECRET` – Usada por `/api/powerbi/cron/run-schedules`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
