# Documentação do Sistema Meta10

Visão geral da estrutura do projeto **meta10** (Next.js 16, App Router), com a localização das telas e das APIs.

---

## 1. Visão geral

- **Stack:** Next.js 16, React 19, Supabase (auth + banco), Tailwind CSS
- **Roteamento:** App Router (`src/app`)
- **Telas autenticadas:** Grupo de rotas `(dashboard)` com layout compartilhado
- **APIs:** Route Handlers em `src/app/api/**/route.ts`

---

## 2. Estrutura principal de pastas

```
meta10/
├── src/
│   ├── app/                    # Rotas (telas + APIs)
│   │   ├── (dashboard)/        # Telas do dashboard (layout com menu)
│   │   ├── api/                # Todas as APIs (Route Handlers)
│   │   ├── login/              # Tela de login
│   │   ├── nps/[hash]/         # Página pública NPS (por link)
│   │   ├── layout.tsx          # Layout raiz
│   │   └── page.tsx            # Página inicial
│   ├── components/             # Componentes reutilizáveis
│   ├── hooks/                  # Hooks (ex: useGroupFilter)
│   ├── lib/                    # Utilitários, Supabase, etc.
│   └── types/                  # Tipos TypeScript
├── docs/                       # Documentação (este arquivo)
├── scripts/                    # Scripts SQL e utilitários
└── package.json
```

---

## 3. Onde ficam as telas (páginas)

Todas as telas são arquivos **`page.tsx`** dentro de `src/app`. A URL segue o caminho da pasta.

### 3.1 Layout e entrada

| Caminho no projeto | URL | Descrição |
|--------------------|-----|-----------|
| `src/app/page.tsx` | `/` | Página inicial |
| `src/app/login/page.tsx` | `/login` | Login |
| `src/app/(dashboard)/layout.tsx` | — | Layout do dashboard (sidebar/menu) |

### 3.2 Dashboard e realização

| Pasta | URL | Descrição |
|-------|-----|-----------|
| `(dashboard)/dashboard/funcionario/page.tsx` | `/dashboard/funcionario` | Dashboard por funcionário |
| `(dashboard)/dashboard/equipe/page.tsx` | `/dashboard/equipe` | Dashboard equipe |
| `(dashboard)/dashboard/empresa/page.tsx` | `/dashboard/empresa` | Dashboard por empresa |
| `(dashboard)/dashboard/empresas/page.tsx` | `/dashboard/empresas` | Lista empresas |
| `(dashboard)/dashboard/realizado/page.tsx` | `/dashboard/realizado` | Realizado |
| `(dashboard)/dashboard/realizado-mes/page.tsx` | `/dashboard/realizado-mes` | Realizado do mês |
| `(dashboard)/dashboard/previsao/page.tsx` | `/dashboard/previsao` | Previsão |
| `(dashboard)/dashboard/importar/page.tsx` | `/dashboard/importar` | Importar |
| `(dashboard)/dashboard/nps/page.tsx` | `/dashboard/nps` | NPS (dashboard) |
| `(dashboard)/dashboard/nps_interno/page.tsx` | `/dashboard/nps_interno` | NPS interno |

### 3.3 Metas

| Pasta | URL | Descrição |
|-------|-----|-----------|
| `(dashboard)/metas/page.tsx` | `/metas` | Metas (geral) |
| `(dashboard)/metas/produtos/page.tsx` | `/metas/produtos` | Metas de produtos |
| `(dashboard)/metas/pesquisas/page.tsx` | `/metas/pesquisas` | Metas de pesquisas |
| `(dashboard)/metas/qualidade/page.tsx` | `/metas/qualidade` | Metas de qualidade |
| `(dashboard)/metas/qualidade/realizado/page.tsx` | `/metas/qualidade/realizado` | Realizado qualidade |
| `(dashboard)/metas/qualidade/categorias/page.tsx` | `/metas/qualidade/categorias` | Categorias qualidade |

### 3.4 Cadastros

| Pasta | URL | Descrição |
|-------|-----|-----------|
| `(dashboard)/cadastros/produtos/page.tsx` | `/cadastros/produtos` | Produtos |
| `(dashboard)/cadastros/categorias/page.tsx` | `/cadastros/categorias` | Categorias |
| `(dashboard)/cadastros/funcionarios/page.tsx` | `/cadastros/funcionarios` | Funcionários |
| `(dashboard)/cadastros/turnos/page.tsx` | `/cadastros/turnos` | Turnos |
| `(dashboard)/cadastros/modo-venda/page.tsx` | `/cadastros/modo-venda` | Modo de venda |

### 3.5 Conciliação

| Pasta | URL | Descrição |
|-------|-----|-----------|
| `(dashboard)/conciliacao/produtos/page.tsx` | `/conciliacao/produtos` | Conciliação produtos |
| `(dashboard)/conciliacao/categorias/page.tsx` | `/conciliacao/categorias` | Conciliação categorias |
| `(dashboard)/conciliacao/empresas/page.tsx` | `/conciliacao/empresas` | Conciliação empresas |
| `(dashboard)/conciliacao/funcionarios/page.tsx` | `/conciliacao/funcionarios` | Conciliação funcionários |

### 3.6 Compras / Matérias-primas

| Pasta | URL | Descrição |
|-------|-----|-----------|
| `(dashboard)/compras/materias-primas/page.tsx` | `/compras/materias-primas` | Matérias-primas |
| `(dashboard)/compras/materias-primas/conciliacao/page.tsx` | `/compras/materias-primas/conciliacao` | Conciliação MP |
| `(dashboard)/compras/materias-primas/conciliacao-estoque/page.tsx` | `/compras/materias-primas/conciliacao-estoque` | Conciliação estoque |
| `(dashboard)/compras/projecao-mp/page.tsx` | `/compras/projecao-mp` | Projeção MP |
| `(dashboard)/compras/projecao-revenda/page.tsx` | `/compras/projecao-revenda` | Projeção revenda |

### 3.7 NPS

| Pasta | URL | Descrição |
|-------|-----|-----------|
| `(dashboard)/nps/page.tsx` | `/nps` | NPS (geral) |
| `(dashboard)/nps/respostas/page.tsx` | `/nps/respostas` | Respostas NPS |
| `(dashboard)/nps/links/page.tsx` | `/nps/links` | Links NPS |
| `(dashboard)/nps/perguntas/page.tsx` | `/nps/perguntas` | Perguntas |
| `(dashboard)/nps/pesquisas/page.tsx` | `/nps/pesquisas` | Pesquisas |
| `(dashboard)/nps/configuracoes/page.tsx` | `/nps/configuracoes` | Configurações NPS |
| `app/nps/[hash]/page.tsx` | `/nps/[hash]` | Página pública da pesquisa (por link) |

### 3.8 Power BI e integrações

| Pasta | URL | Descrição |
|-------|-----|-----------|
| `(dashboard)/powerbi/sincronizacao/page.tsx` | `/powerbi/sincronizacao` | Sincronização Power BI |
| `(dashboard)/powerbi/conexoes/page.tsx` | `/powerbi/conexoes` | Conexões Power BI |

### 3.9 Configuração e administração

| Pasta | URL | Descrição |
|-------|-----|-----------|
| `(dashboard)/grupos/page.tsx` | `/grupos` | Grupos |
| `(dashboard)/empresas/page.tsx` | `/empresas` | Empresas |
| `(dashboard)/usuarios/page.tsx` | `/usuarios` | Usuários |
| `(dashboard)/usuarios/[id]/permissoes/page.tsx` | `/usuarios/[id]/permissoes` | Permissões do usuário |
| `(dashboard)/debug/tereza/page.tsx` | `/debug/tereza` | Debug (Tereza) |

---

## 4. Onde ficam as APIs

Todas as APIs são **Route Handlers** em arquivos **`route.ts`** dentro de `src/app/api`. O método HTTP (GET, POST, PUT, PATCH, DELETE) é o que define o handler (export `GET`, `POST`, etc.).

### 4.1 Dashboard

| Arquivo | Rota da API | Uso principal |
|---------|-------------|----------------|
| `api/dashboard/employee/route.ts` | `GET /api/dashboard/employee` | Dados do dashboard funcionário |
| `api/dashboard/team/route.ts` | `GET /api/dashboard/team` | Dados do dashboard equipe |
| `api/dashboard/company/route.ts` | `GET /api/dashboard/company` | Dashboard empresa |
| `api/dashboard/companies/route.ts` | `GET /api/dashboard/companies` | Lista empresas (dashboard) |
| `api/dashboard/realizado/route.ts` | `GET /api/dashboard/realizado` | Realizado |
| `api/dashboard/realizado-mes/route.ts` | `GET /api/dashboard/realizado-mes` | Realizado do mês |
| `api/dashboard/previsao/route.ts` | `GET /api/dashboard/previsao` | Previsão |
| `api/dashboard/nps/route.ts` | (se existir) | NPS dashboard |
| `api/dashboard/refresh-view/route.ts` | `POST /api/dashboard/refresh-view` | Atualizar view materializada |

### 4.2 Metas e metas de pesquisa

| Arquivo | Rota da API | Uso principal |
|---------|-------------|----------------|
| `api/goals/route.ts` | `GET/POST /api/goals` | Metas (listar/criar) |
| `api/goals/[id]/route.ts` | `GET/PUT/DELETE /api/goals/[id]` | Meta por ID |
| `api/goals/template/route.ts` | `GET /api/goals/template` | Template de metas |
| `api/goals/products/route.ts` | `GET /api/goals/products` | Metas de produtos |
| `api/goals/import/route.ts` | `POST /api/goals/import` | Importar metas |
| `api/goals/duplicate/route.ts` | `POST /api/goals/duplicate` | Duplicar metas |
| `api/research-goals/route.ts` | `GET /api/research-goals` | Metas de pesquisa |

### 4.3 Metas de qualidade

| Arquivo | Rota da API | Uso principal |
|---------|-------------|----------------|
| `api/quality-goals/route.ts` | `GET/POST /api/quality-goals` | Metas qualidade |
| `api/quality-goals/[id]/route.ts` | `GET/PUT/DELETE /api/quality-goals/[id]` | Meta qualidade por ID |
| `api/quality-categories/route.ts` | `GET/POST /api/quality-categories` | Categorias qualidade |
| `api/quality-categories/[id]/route.ts` | `GET/PUT/DELETE /api/quality-categories/[id]` | Categoria por ID |
| `api/quality-results/route.ts` | `GET/POST /api/quality-results` | Resultados qualidade |
| `api/quality-results/[id]/route.ts` | `GET/PUT/DELETE /api/quality-results/[id]` | Resultado por ID |

### 4.4 Cadastros (CRUD)

| Arquivo | Rota da API | Uso principal |
|---------|-------------|----------------|
| `api/companies/route.ts` | `GET/POST /api/companies` | Empresas |
| `api/companies/[id]/route.ts` | `GET/PUT/DELETE /api/companies/[id]` | Empresa por ID |
| `api/employees/route.ts` | `GET/POST /api/employees` | Funcionários |
| `api/employees/[id]/route.ts` | `GET/PUT/DELETE /api/employees/[id]` | Funcionário por ID |
| `api/products/route.ts` | `GET/POST /api/products` | Produtos |
| `api/products/[id]/route.ts` | `GET/PUT/DELETE /api/products/[id]` | Produto por ID |
| `api/categories/route.ts` | `GET/POST /api/categories` | Categorias |
| `api/categories/[id]/route.ts` | `GET/PUT/DELETE /api/categories/[id]` | Categoria por ID |
| `api/groups/route.ts` | `GET/POST /api/groups` | Grupos |
| `api/groups/[id]/route.ts` | `GET/PUT/DELETE /api/groups/[id]` | Grupo por ID |
| `api/shifts/route.ts` | `GET/POST /api/shifts` | Turnos |
| `api/shifts/[id]/route.ts` | `GET/PUT/DELETE /api/shifts/[id]` | Turno por ID |
| `api/sale-modes/route.ts` | `GET/POST /api/sale-modes` | Modos de venda |
| `api/sale-modes/[id]/route.ts` | `GET/PUT/DELETE /api/sale-modes/[id]` | Modo de venda por ID |
| `api/product-tags/route.ts` | `GET/POST /api/product-tags` | Tags de produto |
| `api/product-tags/assignments/route.ts` | `GET/POST /api/product-tags/assignments` | Atribuições de tags |

### 4.5 Conciliação e mapeamentos

| Arquivo | Rota da API | Uso principal |
|---------|-------------|----------------|
| `api/external-products/route.ts` | `GET /api/external-products` | Produtos externos |
| `api/external-products/[id]/route.ts` | `GET /api/external-products/[id]` | Produto externo por ID |
| `api/external-categories/route.ts` | `GET /api/external-categories` | Categorias externas |
| `api/external-companies/route.ts` | `GET /api/external-companies` | Empresas externas |
| `api/external-companies/[id]/route.ts` | `GET /api/external-companies/[id]` | Empresa externa por ID |
| `api/external-employees/route.ts` | `GET /api/external-employees` | Funcionários externos |
| `api/external-employees/[id]/route.ts` | `GET /api/external-employees/[id]` | Funcionário externo por ID |
| `api/mappings/products/route.ts` | `GET/POST/DELETE /api/mappings/products` | Mapeamentos produto |
| `api/mappings/categories/route.ts` | `GET/POST/DELETE /api/mappings/categories` | Mapeamentos categoria |
| `api/mappings/companies/route.ts` | `GET/POST/DELETE /api/mappings/companies` | Mapeamentos empresa |
| `api/mappings/employees/route.ts` | `GET/POST/DELETE /api/mappings/employees` | Mapeamentos funcionário |

### 4.6 Compras / Matérias-primas e projeção

| Arquivo | Rota da API | Uso principal |
|---------|-------------|----------------|
| `api/raw-materials/route.ts` | `GET/POST /api/raw-materials` | Matérias-primas |
| `api/raw-materials/[id]/route.ts` | `GET/PUT/DELETE /api/raw-materials/[id]` | MP por ID |
| `api/raw-materials/[id]/products/route.ts` | `GET /api/raw-materials/[id]/products` | Produtos da MP |
| `api/raw-materials/[id]/stock/route.ts` | `GET /api/raw-materials/[id]/stock` | Estoque da MP |
| `api/external-stock/route.ts` | `GET /api/external-stock` | Estoque externo |
| `api/projection/raw-materials/route.ts` | `GET /api/projection/raw-materials` | Projeção MP |
| `api/projection/resale/route.ts` | `GET /api/projection/resale` | Projeção revenda |

### 4.7 NPS

| Arquivo | Rota da API | Uso principal |
|---------|-------------|----------------|
| `api/nps/respostas/route.ts` | `GET /api/nps/respostas` | Respostas NPS |
| `api/nps/pesquisas/route.ts` | `GET/POST /api/nps/pesquisas` | Pesquisas |
| `api/nps/perguntas/route.ts` | `GET/POST /api/nps/perguntas` | Perguntas |
| `api/nps/links/route.ts` | `GET/POST /api/nps/links` | Links |
| `api/nps/links/qrcode/route.ts` | `GET /api/nps/links/qrcode` | QR Code do link |
| `api/nps/opcoes-origem/route.ts` | `GET /api/nps/opcoes-origem` | Opções de origem |
| `api/nps/dashboard/route.ts` | `GET /api/nps/dashboard` | Dashboard NPS |

### 4.8 Power BI

| Arquivo | Rota da API | Uso principal |
|---------|-------------|----------------|
| `api/powerbi/connections/route.ts` | `GET/POST /api/powerbi/connections` | Conexões |
| `api/powerbi/connections/[id]/route.ts` | `GET/PUT/DELETE /api/powerbi/connections/[id]` | Conexão por ID |
| `api/powerbi/connections/[id]/test/route.ts` | `POST /api/powerbi/connections/[id]/test` | Testar conexão |
| `api/powerbi/sync/route.ts` | `POST /api/powerbi/sync` | Sincronizar |
| `api/powerbi/sync-queue/route.ts` | `GET/POST /api/powerbi/sync-queue` | Fila de sincronização |
| `api/powerbi/sync-queue/process/route.ts` | `POST /api/powerbi/sync-queue/process` | Processar fila |
| `api/powerbi/sync-queue/test-query/route.ts` | `POST /api/powerbi/sync-queue/test-query` | Testar query |
| `api/powerbi/sync-stats/route.ts` | `GET /api/powerbi/sync-stats` | Estatísticas de sync |
| `api/powerbi/sync-configs/route.ts` | `GET/POST /api/powerbi/sync-configs` | Configs de sync |
| `api/powerbi/sync-configs/[id]/route.ts` | `GET/PUT/DELETE /api/powerbi/sync-configs/[id]` | Config por ID |
| `api/powerbi/sync-configs/[id]/clear-data/route.ts` | `POST .../clear-data` | Limpar dados da config |
| `api/powerbi/schedules/route.ts` | `GET/POST /api/powerbi/schedules` | Agendamentos |
| `api/powerbi/schedules/[id]/route.ts` | `GET/PUT/DELETE /api/powerbi/schedules/[id]` | Agendamento por ID |
| `api/powerbi/cron/run-schedules/route.ts` | `POST /api/powerbi/cron/run-schedules` | Cron: executar agendamentos |
| `api/powerbi/import-spreadsheet/route.ts` | `POST /api/powerbi/import-spreadsheet` | Importar planilha |

### 4.9 Goomer

| Arquivo | Rota da API | Uso principal |
|---------|-------------|----------------|
| `api/goomer/unidades/route.ts` | `GET /api/goomer/unidades` | Unidades Goomer |
| `api/goomer/dashboard/route.ts` | `GET /api/goomer/dashboard` | Dashboard Goomer |
| `api/goomer/import/route.ts` | `POST /api/goomer/import` | Importar Goomer |

### 4.10 Usuários e autenticação

| Arquivo | Rota da API | Uso principal |
|---------|-------------|----------------|
| `api/auth/login/route.ts` | `POST /api/auth/login` | Login |
| `api/auth/change-password/route.ts` | `POST /api/auth/change-password` | Trocar senha |
| `api/users/route.ts` | `GET/POST /api/users` | Usuários |
| `api/users/[id]/route.ts` | `GET/PUT/DELETE /api/users/[id]` | Usuário por ID |
| `api/users/[id]/permissions/route.ts` | `GET/PUT /api/users/[id]/permissions` | Permissões |
| `api/users/[id]/change-password/route.ts` | `POST .../change-password` | Trocar senha do usuário |
| `api/users/[id]/companies/route.ts` | `GET /api/users/[id]/companies` | Empresas do usuário |
| `api/modules/route.ts` | `GET /api/modules` | Módulos (permissões) |

### 4.11 Debug

| Arquivo | Rota da API | Uso principal |
|---------|-------------|----------------|
| `api/debug/tereza/route.ts` | `GET/POST /api/debug/tereza` | Debug Tereza |

---

## 5. Outras pastas importantes

| Pasta | Conteúdo |
|-------|----------|
| `src/components/` | Componentes React reutilizáveis (UI, formulários, etc.) |
| `src/components/ui/` | Componentes de interface (Button, Input, Modal, etc.) |
| `src/hooks/` | Hooks (ex: `useGroupFilter` para filtro de grupo no dashboard) |
| `src/lib/` | Cliente Supabase, interceptors, utilitários |
| `src/types/` | Interfaces e tipos TypeScript (index.ts) |
| `scripts/` | Scripts SQL e de apoio (ex: check_goomer_banco.sql) |

---

## 6. Convenções

- **Telas:** uma pasta por rota, com `page.tsx` (e opcionalmente `layout.tsx`). Rotas dinâmicas usam `[param]`.
- **APIs:** uma pasta por recurso, com `route.ts` exportando `GET`, `POST`, `PUT`, `PATCH` ou `DELETE`.
- **Layout dashboard:** todas as rotas dentro de `(dashboard)` usam o mesmo layout (sidebar, filtro de grupo, etc.).
- **Grupo de rotas:** pastas entre parênteses, como `(dashboard)`, não entram na URL (são apenas organização).

---

*Documento gerado para o projeto meta10. Atualize este arquivo quando adicionar novas telas ou APIs.*
