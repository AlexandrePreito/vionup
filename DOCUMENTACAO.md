# Documentação do Sistema Meta10

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Estrutura do Projeto](#estrutura-do-projeto)
3. [Banco de Dados (Supabase)](#banco-de-dados-supabase)
4. [APIs Disponíveis](#apis-disponíveis)
5. [Localização dos Arquivos](#localização-dos-arquivos)

---

## 🎯 Visão Geral

O **Meta10** é um sistema de gestão de metas e conciliação de dados desenvolvido em **Next.js 16** com **TypeScript**, utilizando **Supabase** como banco de dados. O sistema permite:

- Gestão de grupos de empresas, empresas e usuários
- Cadastro de produtos, funcionários, categorias, turnos e modos de venda
- Integração com Power BI para sincronização de dados externos
- Conciliação de dados entre sistemas internos e externos
- Projeção de compras e gestão de matérias-primas
- Dashboard com métricas, previsão de vendas (cenários Otimista/Realista/Pessimista), meta da empresa, salvar e acompanhar projeções vs realizado

---

## 📁 Estrutura do Projeto

```
meta10/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Rotas de autenticação
│   │   ├── (dashboard)/       # Rotas do dashboard
│   │   └── api/               # API Routes (Backend)
│   ├── components/            # Componentes React
│   ├── contexts/              # Contextos React
│   ├── hooks/                 # Custom hooks
│   ├── lib/                   # Bibliotecas e utilitários
│   └── types/                 # Definições TypeScript
├── supabase/
│   └── migrations/            # Migrations do Supabase
├── sql/                       # Scripts SQL adicionais
└── public/                    # Arquivos estáticos
```

---

## 🗄️ Banco de Dados (Supabase)

O sistema utiliza **Supabase** como banco de dados PostgreSQL. Todas as tabelas estão hospedadas no Supabase e podem ser acessadas através do cliente configurado em `src/lib/supabase.ts`.

### 📍 Localização das Migrations

- **Pasta principal**: `supabase/migrations/`
- **Scripts SQL adicionais**: `sql/`

### 📊 Tabelas do Sistema

#### **Tabelas Principais**

| Tabela | Descrição | Localização |
|--------|-----------|-------------|
| `company_groups` | Grupos de empresas | Supabase |
| `companies` | Empresas | Supabase |
| `users` | Usuários do sistema | Supabase |
| `products` | Produtos internos | Supabase |
| `employees` | Funcionários | Supabase |
| `categories` | Categorias internas (hierárquica) | `sql/create_categories_tables.sql` |
| `category_mappings` | Mapeamentos de categorias | `sql/create_categories_tables.sql` |
| `shifts` | Turnos de trabalho | `supabase/migrations/create_shifts_table.sql` |
| `sale_modes` | Modos de venda | Supabase |

#### **Tabelas de Dados Externos (Power BI)**

| Tabela | Descrição | Localização |
|--------|-----------|-------------|
| `external_products` | Produtos sincronizados do Power BI | Supabase |
| `external_employees` | Funcionários sincronizados do Power BI | Supabase |
| `external_companies` | Empresas sincronizadas do Power BI | Supabase |
| `external_categories` | Categorias sincronizadas do Power BI | Supabase |
| `external_sales` | Vendas sincronizadas do Power BI | Supabase |
| `external_cash_flow` | Fluxo de caixa sincronizado do Power BI | Supabase |
| `external_cash_flow_statement` | DFC (Demonstração de Fluxo de Caixa) | Supabase |
| `external_stock` | Estoque sincronizado do Power BI | Supabase |

#### **Tabelas de Mapeamentos (Conciliação)**

| Tabela | Descrição | Localização |
|--------|-----------|-------------|
| `product_mappings` | Mapeamento produto interno ↔ externo | Supabase |
| `employee_mappings` | Mapeamento funcionário interno ↔ externo | Supabase |
| `company_mappings` | Mapeamento empresa interna ↔ externa | Supabase |
| `category_mappings` | Mapeamento categoria interna ↔ externa | `sql/create_categories_tables.sql` |

#### **Tabelas de Power BI**

| Tabela | Descrição | Localização |
|--------|-----------|-------------|
| `powerbi_connections` | Conexões com Power BI | Supabase |
| `powerbi_sync_configs` | Configurações de sincronização | Supabase |
| `powerbi_sync_logs` | Logs de sincronização | Supabase |
| `powerbi_sync_schedules` | Agendamentos de sincronização | Supabase |

#### **Tabelas de Compras**

| Tabela | Descrição | Localização |
|--------|-----------|-------------|
| `raw_materials` | Matérias-primas | Supabase |
| `raw_material_products` | Vínculo matéria-prima ↔ produto | Supabase |
| `raw_material_stock` | Vínculo matéria-prima ↔ estoque | Supabase |
| `inventory_counts` | Contagens de inventário | Supabase |
| `inventory_count_items` | Itens de contagem | Supabase |
| `purchase_projections` | Projeções de compra | Supabase |
| `purchase_projection_items` | Itens de projeção | Supabase |

#### **Tabelas de Metas**

| Tabela | Descrição | Localização |
|--------|-----------|-------------|
| `sales_goals` | Metas de faturamento (empresa, turno, modo, produtos, pesquisas) | Supabase |
| `goal_products` | Produtos vinculados às metas | Supabase |
| `saved_projections` | Projeções de previsão salvas (cenários + gráfico dia a dia, para acompanhamento vs realizado) | `supabase/migrations/20260220_create_saved_projections.sql` |

#### **Tabelas de Tags**

| Tabela | Descrição | Localização |
|--------|-----------|-------------|
| `product_tags` | Tags de produtos | Supabase |
| `product_tag_assignments` | Atribuições de tags | Supabase |

### 🔧 Migrations Disponíveis

1. **`supabase/migrations/create_shifts_table.sql`**
   - Cria a tabela `shifts` (turnos)
   - Configura índices, triggers e políticas RLS

2. **`supabase/migrations/add_period_fields_to_sync_configs.sql`**
   - Adiciona campo `period` nas tabelas `external_sales` e `external_cash_flow`

3. **`supabase/migrations/20260220_create_saved_projections.sql`**
   - Cria a tabela `saved_projections` (projeções de previsão salvas para acompanhamento vs realizado)
   - Campos: cenários (otimista/realista/pessimista), meta_empresa, realizado_no_save, projecao_diaria (JSONB), saved_by, description, is_active

4. **`sql/create_categories_tables.sql`**
   - Cria as tabelas `categories` e `category_mappings`
   - Configura índices e triggers

---

## 🔌 APIs Disponíveis

Todas as APIs estão localizadas em `src/app/api/` e seguem o padrão Next.js App Router.

### 📍 Estrutura Base

Todas as rotas seguem o padrão: `/api/{recurso}/[id]/route.ts`

### 🔐 Autenticação

| Rota | Método | Descrição | Arquivo |
|------|--------|-----------|---------|
| `/api/auth/*` | - | Rotas de autenticação | `src/app/api/auth/` |

### 👥 Usuários

| Rota | Método | Descrição | Arquivo |
|------|--------|-----------|---------|
| `/api/users` | GET, POST | Listar e criar usuários | `src/app/api/users/route.ts` |
| `/api/users/[id]` | GET, PUT, DELETE | Obter, atualizar e deletar usuário | `src/app/api/users/[id]/route.ts` |

### 🏢 Grupos e Empresas

| Rota | Método | Descrição | Arquivo |
|------|--------|-----------|---------|
| `/api/groups` | GET, POST | Listar e criar grupos | `src/app/api/groups/route.ts` |
| `/api/groups/[id]` | GET, PUT, DELETE | Gerenciar grupo | `src/app/api/groups/[id]/route.ts` |
| `/api/companies` | GET, POST | Listar e criar empresas | `src/app/api/companies/route.ts` |
| `/api/companies/[id]` | GET, PUT, DELETE | Gerenciar empresa | `src/app/api/companies/[id]/route.ts` |

### 📦 Produtos

| Rota | Método | Descrição | Arquivo |
|------|--------|-----------|---------|
| `/api/products` | GET, POST | Listar e criar produtos | `src/app/api/products/route.ts` |
| `/api/products/[id]` | GET, PUT, DELETE | Gerenciar produto | `src/app/api/products/[id]/route.ts` |
| `/api/product-tags` | GET, POST | Gerenciar tags de produtos | `src/app/api/product-tags/route.ts` |
| `/api/product-tags/assignments` | GET, POST | Atribuir tags a produtos | `src/app/api/product-tags/assignments/route.ts` |

### 👨‍💼 Funcionários

| Rota | Método | Descrição | Arquivo |
|------|--------|-----------|---------|
| `/api/employees` | GET, POST | Listar e criar funcionários | `src/app/api/employees/route.ts` |
| `/api/employees/[id]` | GET, PUT, DELETE | Gerenciar funcionário | `src/app/api/employees/[id]/route.ts` |

### 📂 Categorias

| Rota | Método | Descrição | Arquivo |
|------|--------|-----------|---------|
| `/api/categories` | GET, POST | Listar e criar categorias | `src/app/api/categories/route.ts` |
| `/api/categories/[id]` | GET, PUT, DELETE | Gerenciar categoria | `src/app/api/categories/[id]/route.ts` |

### ⏰ Turnos

| Rota | Método | Descrição | Arquivo |
|------|--------|-----------|---------|
| `/api/shifts` | GET, POST | Listar e criar turnos | `src/app/api/shifts/route.ts` |
| `/api/shifts/[id]` | GET, PUT, DELETE | Gerenciar turno | `src/app/api/shifts/[id]/route.ts` |

### 💰 Modos de Venda

| Rota | Método | Descrição | Arquivo |
|------|--------|-----------|---------|
| `/api/sale-modes` | GET, POST | Listar e criar modos de venda | `src/app/api/sale-modes/route.ts` |
| `/api/sale-modes/[id]` | GET, PUT, DELETE | Gerenciar modo de venda | `src/app/api/sale-modes/[id]/route.ts` |

### 🔄 Dados Externos (Power BI)

| Rota | Método | Descrição | Arquivo |
|------|--------|-----------|---------|
| `/api/external-products` | GET | Listar produtos externos | `src/app/api/external-products/route.ts` |
| `/api/external-products/[id]` | GET, PUT, DELETE | Gerenciar produto externo | `src/app/api/external-products/[id]/route.ts` |
| `/api/external-employees` | GET | Listar funcionários externos | `src/app/api/external-employees/route.ts` |
| `/api/external-employees/[id]` | GET, PUT, DELETE | Gerenciar funcionário externo | `src/app/api/external-employees/[id]/route.ts` |
| `/api/external-companies` | GET | Listar empresas externas | `src/app/api/external-companies/route.ts` |
| `/api/external-companies/[id]` | GET, PUT, DELETE | Gerenciar empresa externa | `src/app/api/external-companies/[id]/route.ts` |
| `/api/external-categories` | GET | Listar categorias externas | `src/app/api/external-categories/route.ts` |
| `/api/external-stock` | GET | Listar estoque externo | `src/app/api/external-stock/route.ts` |

### 🔗 Mapeamentos (Conciliação)

| Rota | Método | Descrição | Arquivo |
|------|--------|-----------|---------|
| `/api/mappings/products` | GET, POST | Mapear produtos | `src/app/api/mappings/products/route.ts` |
| `/api/mappings/employees` | GET, POST | Mapear funcionários | `src/app/api/mappings/employees/route.ts` |
| `/api/mappings/companies` | GET, POST | Mapear empresas | `src/app/api/mappings/companies/route.ts` |
| `/api/mappings/categories` | GET, POST | Mapear categorias | `src/app/api/mappings/categories/route.ts` |

### 📊 Power BI

| Rota | Método | Descrição | Arquivo |
|------|--------|-----------|---------|
| `/api/powerbi/connections` | GET, POST | Gerenciar conexões Power BI | `src/app/api/powerbi/connections/route.ts` |
| `/api/powerbi/connections/[id]` | GET, PUT, DELETE | Gerenciar conexão específica | `src/app/api/powerbi/connections/[id]/route.ts` |
| `/api/powerbi/connections/[id]/test` | POST | Testar conexão | `src/app/api/powerbi/connections/[id]/test/route.ts` |
| `/api/powerbi/sync-configs` | GET, POST | Gerenciar configurações de sync | `src/app/api/powerbi/sync-configs/route.ts` |
| `/api/powerbi/sync-configs/[id]` | GET, PUT, DELETE | Gerenciar config específica | `src/app/api/powerbi/sync-configs/[id]/route.ts` |
| `/api/powerbi/schedules` | GET, POST | Gerenciar agendamentos | `src/app/api/powerbi/schedules/route.ts` |
| `/api/powerbi/schedules/[id]` | GET, PUT, DELETE | Gerenciar agendamento específico | `src/app/api/powerbi/schedules/[id]/route.ts` |
| `/api/powerbi/sync` | POST | Executar sincronização | `src/app/api/powerbi/sync/route.ts` |

### 🎯 Metas

| Rota | Método | Descrição | Arquivo |
|------|--------|-----------|---------|
| `/api/goals` | GET, POST | Listar e criar metas (faturamento, turno, modo, etc.) | `src/app/api/goals/route.ts` |
| `/api/goals/[id]` | GET, PUT, DELETE | Gerenciar meta | `src/app/api/goals/[id]/route.ts` |
| `/api/goals/import` | POST | Importar metas | `src/app/api/goals/import/route.ts` |
| `/api/goals/duplicate` | POST | Duplicar meta | `src/app/api/goals/duplicate/route.ts` |
| `/api/goals/template` | GET | Obter template de meta | `src/app/api/goals/template/route.ts` |
| `/api/goals/products` | GET, POST | Gerenciar produtos da meta | `src/app/api/goals/products/route.ts` |
| `/api/financial-goals` | GET, POST | Metas financeiras (entradas/saídas por categoria) | `src/app/api/financial-goals/route.ts` |
| `/api/financial-goals/[id]` | GET, PUT, DELETE | Gerenciar meta financeira | `src/app/api/financial-goals/[id]/route.ts` |
| `/api/financial-responsibles` | GET, POST | Responsáveis (metas financeiras) | `src/app/api/financial-responsibles/route.ts` |
| `/api/financial-responsibles/[id]` | GET, PUT, DELETE | Gerenciar responsável | `src/app/api/financial-responsibles/[id]/route.ts` |

### 📈 Dashboard

| Rota | Método | Descrição | Arquivo |
|------|--------|-----------|---------|
| `/api/dashboard/companies` | GET | Dados de empresas para dashboard | `src/app/api/dashboard/companies/route.ts` |
| `/api/dashboard/company` | GET | Dados de uma empresa (meta faturamento, turnos, modos, tendência) | `src/app/api/dashboard/company/route.ts` |
| `/api/dashboard/employee` | GET | Dados de funcionário | `src/app/api/dashboard/employee/route.ts` |
| `/api/dashboard/team` | GET | Dados de equipe | `src/app/api/dashboard/team/route.ts` |
| `/api/dashboard/previsao` | GET | Previsão de vendas (cenários, gráficos, projeção dia a dia) | `src/app/api/dashboard/previsao/route.ts` |
| `/api/dashboard/refresh-view` | POST | Atualizar view materializada (dados de caixa) | `src/app/api/dashboard/refresh-view/route.ts` |
| `/api/dashboard-financeiro` | GET | Dashboard financeiro (metas por categoria) | `src/app/api/dashboard-financeiro/route.ts` |
| `/api/saved-projections` | GET, POST | Listar e salvar projeções de previsão | `src/app/api/saved-projections/route.ts` |
| `/api/saved-projections/[id]` | DELETE | Excluir (soft) projeção salva | `src/app/api/saved-projections/[id]/route.ts` |

### 🛒 Compras

| Rota | Método | Descrição | Arquivo |
|------|--------|-----------|---------|
| `/api/raw-materials` | GET, POST | Gerenciar matérias-primas | `src/app/api/raw-materials/route.ts` |
| `/api/raw-materials/[id]` | GET, PUT, DELETE | Gerenciar matéria-prima específica | `src/app/api/raw-materials/[id]/route.ts` |
| `/api/raw-materials/[id]/products` | GET, POST | Produtos vinculados à matéria-prima | `src/app/api/raw-materials/[id]/products/route.ts` |
| `/api/raw-materials/[id]/stock` | GET, POST | Estoque da matéria-prima | `src/app/api/raw-materials/[id]/stock/route.ts` |
| `/api/projection/raw-materials` | GET, POST | Projeção de matérias-primas | `src/app/api/projection/raw-materials/route.ts` |
| `/api/projection/resale` | GET, POST | Projeção de revenda | `src/app/api/projection/resale/route.ts` |

### 🐛 Debug

| Rota | Método | Descrição | Arquivo |
|------|--------|-----------|---------|
| `/api/debug/tereza` | GET | Debug específico | `src/app/api/debug/tereza/route.ts` |

---

## 📂 Localização dos Arquivos

### 🔧 Configuração do Banco de Dados

- **Cliente Supabase**: `src/lib/supabase.ts`
  - `supabase`: Cliente para uso no browser (client-side)
  - `supabaseAdmin`: Cliente para uso no servidor (server-side) com service role

### 📝 Tipos TypeScript

- **Definições de tipos**: `src/types/index.ts`
  - Contém todas as interfaces e tipos utilizados no sistema
  - Inclui: CompanyGroup, Company, User, Product, Employee, Category, Goal, PowerBI, etc.

### 🗄️ Scripts SQL

- **Migrations do Supabase**: `supabase/migrations/`
- **Scripts SQL adicionais**: `sql/`
- **Scripts de debug**: `debug_previsao.sql` (raiz do projeto)

### 🎨 Componentes

- **Componentes de UI**: `src/components/ui/`
- **Componentes de formulários**: `src/components/forms/`
- **Componentes de layout**: `src/components/layout/`

### 📱 Páginas

- **Páginas públicas**: `src/app/page.tsx`
- **Páginas de autenticação**: `src/app/(auth)/`
- **Páginas do dashboard**: `src/app/(dashboard)/`

---

## 🔑 Variáveis de Ambiente

O sistema utiliza as seguintes variáveis de ambiente (configuradas no Supabase):

- `NEXT_PUBLIC_SUPABASE_URL`: URL do projeto Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Chave anônima do Supabase
- `SUPABASE_SERVICE_ROLE_KEY`: Chave de service role do Supabase (apenas servidor)

---

## 📚 Tecnologias Utilizadas

- **Framework**: Next.js 16.1.6
- **Linguagem**: TypeScript 5
- **Banco de Dados**: Supabase (PostgreSQL)
- **Estilização**: Tailwind CSS 4
- **Gráficos**: Recharts 3.7.0
- **Autenticação**: Supabase Auth
- **Integração**: Power BI REST API

---

## 📝 Notas Importantes

1. **Todas as tabelas estão no Supabase** - Não há uso de SQLite no projeto
2. **APIs seguem padrão REST** - Utilizando métodos HTTP padrão (GET, POST, PUT, DELETE)
3. **Autenticação via Supabase** - Sistema de autenticação gerenciado pelo Supabase
4. **Row Level Security (RLS)** - Algumas tabelas possuem políticas RLS configuradas
5. **Migrations** - As migrations devem ser executadas no Supabase para criar/atualizar tabelas

---

## 📚 Documentação Adicional

| Documento | Descrição |
|-----------|-----------|
| [docs/DOCUMENTACAO_SISTEMA.md](docs/DOCUMENTACAO_SISTEMA.md) | **Estrutura do sistema** — Telas, APIs, convenções e fluxo da Previsão/projeções salvas |
| [docs/SINCRONIZACAO_SISTEMA.md](docs/SINCRONIZACAO_SISTEMA.md) | **Sincronização Power BI** — Telas, APIs e Cron (foco em agendamentos automáticos) |
| [docs/SINCRONIZACAO_APIS_E_PAGINAS.md](docs/SINCRONIZACAO_APIS_E_PAGINAS.md) | Referência de APIs e páginas do módulo de sincronização |
| [docs/SINCRONIZACAO_POWERBI_COMPLETA.md](docs/SINCRONIZACAO_POWERBI_COMPLETA.md) | Arquitetura completa, tabelas, DAX e troubleshooting |
| [docs/VERCEL_CRON_SYNC.md](docs/VERCEL_CRON_SYNC.md) | Configuração do Cron no Vercel |

---

## 🔍 Como Usar Esta Documentação

1. **Para encontrar uma tabela**: Consulte a seção [Banco de Dados](#banco-de-dados-supabase)
2. **Para encontrar uma API**: Consulte a seção [APIs Disponíveis](#apis-disponíveis)
3. **Para entender a estrutura**: Consulte a seção [Estrutura do Projeto](#estrutura-do-projeto)
4. **Para localizar arquivos**: Consulte a seção [Localização dos Arquivos](#localização-dos-arquivos)
5. **Para sincronização Power BI e Cron**: Consulte [docs/SINCRONIZACAO_SISTEMA.md](docs/SINCRONIZACAO_SISTEMA.md)

---

**Última atualização**: Fevereiro 2026
