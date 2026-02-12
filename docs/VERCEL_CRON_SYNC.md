# Agendamento automático no Vercel (Cron)

Para que os **agendamentos** de sincronização Power BI (diário/semanal) rodem sozinhos no Vercel, é preciso:

## 1. Configuração já feita no projeto

- **API:** `GET /api/powerbi/cron/run-schedules`  
  - Lê agendamentos ativos com `next_run_at <= agora`, coloca a sync na fila e atualiza a próxima execução.
- **vercel.json:** cron a cada **15 minutos** chamando essa API.

## 2. O que você precisa configurar no Vercel

### Variável de ambiente `CRON_SECRET`

1. No [Vercel Dashboard](https://vercel.com) → seu projeto → **Settings** → **Environment Variables**.
2. Crie uma variável:
   - **Name:** `CRON_SECRET`
   - **Value:** uma chave secreta com **pelo menos 16 caracteres** (ex.: gere com `openssl rand -hex 16`).
   - **Environment:** Production (e Preview se quiser testar em preview).
3. Faça um **redeploy** para a variável valer.

O Vercel envia automaticamente `Authorization: Bearer <CRON_SECRET>` ao chamar o cron. A API só processa se esse header bater com a variável.

### Plano do Vercel

- **Cron Jobs** estão disponíveis em planos **Pro** (e superiores). Em plano Hobby, o cron não roda em produção.
- Confirme em: Project → **Settings** → **Cron Jobs**.

## 3. Como funciona

1. A cada **15 minutos** o Vercel chama `GET /api/powerbi/cron/run-schedules` com o header de autorização.
2. A API busca em `powerbi_sync_schedules` os registros com `is_active = true` e `next_run_at <= agora`.
3. Para cada um, insere um item na `sync_queue` (tipo incremental ou full conforme a config) e atualiza `next_run_at` para o próximo dia ou próxima semana.
4. O processamento da fila continua igual ao fluxo atual (quem chama `/api/powerbi/sync-queue/process` ou o front que faz o polling).

## 4. Horário (timezone)

- O Vercel executa o cron em **UTC**.
- O `next_run_at` é guardado em ISO (UTC). Quando o agendamento é criado na aplicação (ex.: “08:00”), o servidor usa o fuso do ambiente; em produção no Vercel, o primeiro “próximo horário” já fica em UTC.
- Ao atualizar a próxima execução, a API mantém o mesmo “horário UTC” e só avança +1 dia (diário) ou +7 dias (semanal).

## 5. Testar manualmente

```bash
curl -H "Authorization: Bearer SEU_CRON_SECRET" \
  "https://SEU_DOMINIO.vercel.app/api/powerbi/cron/run-schedules"
```

Resposta esperada (exemplo sem agendamentos no horário):

```json
{ "ok": true, "triggered": 0, "message": "Nenhum agendamento no horário" }
```

Com agendamentos disparados:

```json
{ "ok": true, "triggered": 2, "results": [ { "scheduleId": "...", "configId": "...", "status": "queued" }, ... ] }
```

## 6. Resumo

| Item                         | Status / Ação                                      |
|-----------------------------|----------------------------------------------------|
| API `/api/powerbi/cron/run-schedules` | ✅ Implementada                                    |
| `vercel.json` com cron      | ✅ A cada 15 min                                   |
| Variável `CRON_SECRET`      | ⚠️ **Você precisa criar no Vercel** (≥ 16 caracteres) |
| Plano Vercel com Cron       | ⚠️ **Pro** (ou superior) para cron em produção     |

Depois de configurar `CRON_SECRET` e fazer o deploy, os agendamentos criados na tela de Sincronização passam a ser executados automaticamente no Vercel.
