# Documentação Completa do Sistema Vion Up!

Documentação com foco em **localização de páginas e APIs**, para facilitar alterações no sistema.

---

## Índice

1. [Mapa de Páginas (Rotas → Arquivos)](#1-mapa-de-páginas-rotas--arquivos)
2. [Mapa de APIs (Endpoints → Arquivos)](#2-mapa-de-apis-endpoints--arquivos)
3. [Página de Metas (/metas) — Detalhada](#3-página-de-metas-metas--detalhada)
4. [Módulos e Navegação](#4-módulos-e-navegação)

---

## 1. Mapa de Páginas (Rotas → Arquivos)

### Dashboard
| Rota | Arquivo |
|------|---------|
| `/` | `src/app/(dashboard)/page.tsx` |
| `/dashboard/empresa` | `src/app/(dashboard)/dashboard/empresa/page.tsx` |
| `/dashboard/empresas` | `src/app/(dashboard)/dashboard/empresas/page.tsx` |
| `/dashboard/equipe` | `src/app/(dashboard)/dashboard/equipe/page.tsx` |
| `/dashboard/funcionario` | `src/app/(dashboard)/dashboard/funcionario/page.tsx` |
| `/dashboard/previsao` | `src/app/(dashboard)/dashboard/previsao/page.tsx` |
| `/dashboard/realizado` | `src/app/(dashboard)/dashboard/realizado/page.tsx` |
| `/dashboard/realizado-mes` | `src/app/(dashboard)/dashboard/realizado-mes/page.tsx` |
| `/dashboard/nps` | `src/app/(dashboard)/dashboard/nps/page.tsx` |
| `/dashboard/nps_interno` | `src/app/(dashboard)/dashboard/nps_interno/page.tsx` |
| `/dashboard/importar` | `src/app/(dashboard)/dashboard/importar/page.tsx` |
| `/dashboard-financeiro` | `src/app/(dashboard)/dashboard-financeiro/page.tsx` |

### Metas
| Rota | Arquivo |
|------|---------|
| `/metas` | `src/app/(dashboard)/metas/page.tsx` |
| `/metas/produtos` | `src/app/(dashboard)/metas/produtos/page.tsx` |
| `/metas/pesquisas` | `src/app/(dashboard)/metas/pesquisas/page.tsx` |
| `/metas/financeiro` | `src/app/(dashboard)/metas/financeiro/page.tsx` |
| `/metas/qualidade` | `src/app/(dashboard)/metas/qualidade/page.tsx` |
| `/metas/qualidade/realizado` | `src/app/(dashboard)/metas/qualidade/realizado/page.tsx` |
| `/metas/qualidade/categorias` | `src/app/(dashboard)/metas/qualidade/categorias/page.tsx` |

### Cadastros
| Rota | Arquivo |
|------|---------|
| `/cadastros/produtos` | `src/app/(dashboard)/cadastros/produtos/page.tsx` |
| `/cadastros/funcionarios` | `src/app/(dashboard)/cadastros/funcionarios/page.tsx` |
| `/cadastros/turnos` | `src/app/(dashboard)/cadastros/turnos/page.tsx` |
| `/cadastros/modo-venda` | `src/app/(dashboard)/cadastros/modo-venda/page.tsx` |
| `/cadastros/categorias` | `src/app/(dashboard)/cadastros/categorias/page.tsx` |
| `/cadastros/responsaveis` | `src/app/(dashboard)/cadastros/responsaveis/page.tsx` |

### Compras
| Rota | Arquivo |
|------|---------|
| `/compras/materias-primas` | `src/app/(dashboard)/compras/materias-primas/page.tsx` |
| `/compras/materias-primas/conciliacao` | `src/app/(dashboard)/compras/materias-primas/conciliacao/page.tsx` |
| `/compras/materias-primas/conciliacao-estoque` | `src/app/(dashboard)/compras/materias-primas/conciliacao-estoque/page.tsx` |
| `/compras/projecao-revenda` | `src/app/(dashboard)/compras/projecao-revenda/page.tsx` |
| `/compras/projecao-mp` | `src/app/(dashboard)/compras/projecao-mp/page.tsx` |
| `/compras/listas-compra` | `src/app/(dashboard)/compras/listas-compra/page.tsx` |

### Conciliação
| Rota | Arquivo |
|------|---------|
| `/conciliacao/produtos` | `src/app/(dashboard)/conciliacao/produtos/page.tsx` |
| `/conciliacao/categorias` | `src/app/(dashboard)/conciliacao/categorias/page.tsx` |
| `/conciliacao/empresas` | `src/app/(dashboard)/conciliacao/empresas/page.tsx` |
| `/conciliacao/funcionarios` | `src/app/(dashboard)/conciliacao/funcionarios/page.tsx` |

### Configuração
| Rota | Arquivo |
|------|---------|
| `/grupos` | `src/app/(dashboard)/grupos/page.tsx` |
| `/empresas` | `src/app/(dashboard)/empresas/page.tsx` |
| `/usuarios` | `src/app/(dashboard)/usuarios/page.tsx` |
| `/usuarios/[id]/permissoes` | `src/app/(dashboard)/usuarios/[id]/permissoes/page.tsx` |

### Power BI
| Rota | Arquivo |
|------|---------|
| `/powerbi/conexoes` | `src/app/(dashboard)/powerbi/conexoes/page.tsx` |
| `/powerbi/sincronizacao` | `src/app/(dashboard)/powerbi/sincronizacao/page.tsx` |

### NPS
| Rota | Arquivo |
|------|---------|
| `/nps` | `src/app/(dashboard)/nps/page.tsx` |
| `/nps/pesquisas` | `src/app/(dashboard)/nps/pesquisas/page.tsx` |
| `/nps/perguntas` | `src/app/(dashboard)/nps/perguntas/page.tsx` |
| `/nps/links` | `src/app/(dashboard)/nps/links/page.tsx` |
| `/nps/respostas` | `src/app/(dashboard)/nps/respostas/page.tsx` |
| `/nps/configuracoes` | `src/app/(dashboard)/nps/configuracoes/page.tsx` |

### Outras
| Rota | Arquivo |
|------|---------|
| `/login` | `src/app/login/page.tsx` |

---

## 2. Mapa de APIs (Endpoints → Arquivos)

### Metas de Faturamento
| Endpoint | Métodos | Arquivo | Tabela |
|----------|---------|---------|--------|
| `/api/goals` | GET, POST | `src/app/api/goals/route.ts` | `sales_goals` |
| `/api/goals/[id]` | GET, PUT, DELETE | `src/app/api/goals/[id]/route.ts` | `sales_goals` |
| `/api/goals/products` | GET, POST | `src/app/api/goals/products/route.ts` | `sales_goals` |
| `/api/goals/duplicate` | POST | `src/app/api/goals/duplicate/route.ts` | `sales_goals` |
| `/api/goals/import` | POST | `src/app/api/goals/import/route.ts` | `sales_goals` |
| `/api/goals/template` | GET | `src/app/api/goals/template/route.ts` | - |

### Metas Financeiras
| Endpoint | Métodos | Arquivo | Tabela |
|----------|---------|---------|--------|
| `/api/financial-goals` | GET, POST | `src/app/api/financial-goals/route.ts` | `financial_goals` |
| `/api/financial-goals/[id]` | GET, PUT, DELETE | `src/app/api/financial-goals/[id]/route.ts` | `financial_goals` |

### Metas de Qualidade e Pesquisa
| Endpoint | Métodos | Arquivo | Tabela |
|----------|---------|---------|--------|
| `/api/quality-goals` | GET, POST | `src/app/api/quality-goals/route.ts` | `quality_goals` |
| `/api/quality-goals/[id]` | GET, PUT, DELETE | `src/app/api/quality-goals/[id]/route.ts` | `quality_goals` |
| `/api/research-goals` | GET, POST | `src/app/api/research-goals/route.ts` | `research_goals` |
| `/api/quality-results` | GET, POST | `src/app/api/quality-results/route.ts` | `quality_results` |
| `/api/quality-categories` | GET | `src/app/api/quality-categories/route.ts` | `quality_categories` |

### Cadastros
| Endpoint | Arquivo | Tabela |
|----------|---------|--------|
| `/api/companies` | `src/app/api/companies/route.ts` | `companies` |
| `/api/employees` | `src/app/api/employees/route.ts` | `employees` |
| `/api/products` | `src/app/api/products/route.ts` | `products` |
| `/api/shifts` | `src/app/api/shifts/route.ts` | `shifts` |
| `/api/sale-modes` | `src/app/api/sale-modes/route.ts` | `sale_modes` |
| `/api/categories` | `src/app/api/categories/route.ts` | `categories` |
| `/api/goals` | `src/app/api/goals/route.ts` | `sales_goals` |
| `/api/financial-responsibles` | `src/app/api/financial-responsibles/route.ts` | `financial_responsibles` |

### Dashboard
| Endpoint | Arquivo | Fonte de Dados |
|----------|---------|----------------|
| `/api/dashboard/realizado` | `src/app/api/dashboard/realizado/route.ts` | `external_cash_flow` |
| `/api/dashboard/company` | `src/app/api/dashboard/company/route.ts` | `external_cash_flow` |
| `/api/dashboard/employee` | `src/app/api/dashboard/employee/route.ts` | `external_sales` |
| `/api/dashboard/team` | `src/app/api/dashboard/team/route.ts` | `external_sales` |
| `/api/dashboard/companies` | `src/app/api/dashboard/companies/route.ts` | `companies` |
| `/api/dashboard/previsao` | `src/app/api/dashboard/previsao/route.ts` | - |
| `/api/dashboard/realizado-mes` | `src/app/api/dashboard/realizado-mes/route.ts` | - |
| `/api/dashboard-financeiro` | `src/app/api/dashboard-financeiro/route.ts` | - |

### Power BI
| Endpoint | Arquivo |
|----------|---------|
| `/api/powerbi/sync-queue` | `src/app/api/powerbi/sync-queue/route.ts` |
| `/api/powerbi/sync-queue/process` | `src/app/api/powerbi/sync-queue/process/route.ts` |
| `/api/powerbi/sync-configs` | `src/app/api/powerbi/sync-configs/route.ts` |
| `/api/powerbi/connections` | `src/app/api/powerbi/connections/route.ts` |
| `/api/powerbi/import-spreadsheet` | `src/app/api/powerbi/import-spreadsheet/route.ts` |

### Outras APIs
| Endpoint | Arquivo |
|----------|---------|
| `/api/groups` | `src/app/api/groups/route.ts` |
| `/api/users` | `src/app/api/users/route.ts` |
| `/api/modules` | `src/app/api/modules/route.ts` |
| `/api/raw-materials` | `src/app/api/raw-materials/route.ts` |
| `/api/projection/raw-materials` | `src/app/api/projection/raw-materials/route.ts` |
| `/api/projection/resale` | `src/app/api/projection/resale/route.ts` |
| `/api/purchase-lists` | `src/app/api/purchase-lists/route.ts` |

---

## 3. Página de Metas (/metas) — Detalhada

**URL:** `http://localhost:3000/metas`  
**Arquivo:** `src/app/(dashboard)/metas/page.tsx`

### Título e propósito
- **Título:** "Meta Faturamento"
- **Descrição:** Gerencie as metas de faturamento por empresa, vendedor, turno e modo de venda

### Tipos de meta (GOAL_TYPES)
| Tipo | Label | Ícone | Campo principal |
|------|-------|-------|-----------------|
| `company_revenue` | Faturamento Empresa | Building | company_id, goal_value |
| `employee_revenue` | Faturamento Vendedor | UserCircle | employee_id, goal_value |
| `shift` | Faturamento Turno | Clock | shift_id, company_id, goal_value |
| `sale_mode` | Faturamento Modo | ShoppingCart | sale_mode_id, company_id, goal_value |

### APIs utilizadas
| API | Quando | Parâmetros |
|-----|--------|------------|
| `GET /api/goals` | `fetchGoals()` | `group_id`, `year`, `month?`, `type?` |
| `POST /api/goals` | `handleSave()`, `handleClone()` | body JSON |
| `PUT /api/goals/[id]` | `handleSave()` (edição) | body JSON |
| `DELETE /api/goals/[id]` | `handleDelete()`, `handleDeleteSelected()` | - |
| `GET /api/goals/template` | `handleDownloadTemplate()` | - |
| `POST /api/goals/import` | `handleImport()` | FormData (file, company_id, year, month) |
| `GET /api/companies` | `fetchCompanies()` | `group_id` |
| `GET /api/employees` | `fetchEmployees()` | `group_id` |
| `GET /api/shifts` | `fetchShifts()` | `group_id` |
| `GET /api/sale-modes` | `fetchSaleModes()` | `group_id` |

### Estrutura do componente
- **Hooks:** `useGroupFilter` (grupos, selectedGroupId)
- **Estados principais:** goals, companies, employees, shifts, saleModes, formData, selectedIds
- **Filtros:** Grupo, Filial, Tipo, Mês, Ano, Busca
- **Paginação:** 20 itens por página

### Funcionalidades
1. **CRUD:** Nova meta, Editar, Excluir, Clonar
2. **Múltiplos itens:** Criar várias metas de uma vez (ex: vários funcionários com valor distribuído)
3. **Derivar valor:** Usar meta de Faturamento Empresa ou Turno como referência
4. **Exportar:** CSV com metas filtradas
5. **Importar:** Planilha Excel (modal com `handleImport`)
6. **Seleção múltipla:** Checkbox para excluir em lote

### Fluxo do modal (Nova/Editar)
1. **Tipo:** company_revenue | employee_revenue | shift | sale_mode
2. **Filial:** Obrigatória para empresa, turno e modo
3. **Ano e Mês**
4. **Valor:** Input formatado em R$ (1.000,00)
5. **Para employee_revenue:** Adicionar múltiplos funcionários com valor distribuído
6. **Para shift:** Adicionar múltiplos turnos com valor distribuído
7. **Para sale_mode:** Adicionar múltiplos modos com valor distribuído
8. **Derivar:** Opção de usar meta de referência (Faturamento Empresa ou Turno)

### Estrutura de dados (SalesGoal)
```typescript
{
  id, company_group_id, goal_type, year, month,
  company_id, employee_id, shift_id, sale_mode_id,
  goal_value, goal_unit, is_active, parent_goal_id,
  company?, employee?, shift?, sale_mode?, parent_goal?
}
```

### Tabela principal
Colunas: Checkbox | Tipo | Descrição | Filial | Período | Valor Meta | Ações (Clonar, Editar, Excluir)

### Onde alterar
- **Layout/estilo:** Linhas 663–906 (header, filtros, tabela)
- **Modal:** Linhas 911–1564 (formulário Nova/Editar)
- **Lógica de salvar:** `handleSave()` (linhas 318–398)
- **Lógica de filtros:** `filteredItems` (linhas 235–257)
- **Tipos de meta:** Constante `GOAL_TYPES` (linhas 40–45)

---

## 4. Módulos e Navegação

Configuração central em `src/lib/navigation-config.ts`:
- `NAV_MODULES` — lista de módulos e páginas
- Usada pelo sidebar, header e tela de permissões
- Ao adicionar rota em `NAV_MODULES`, ela aparece no menu e nas permissões

### Módulo Metas (navigation-config)
```typescript
{
  name: 'metas',
  label: 'Metas',
  pages: [
    { route: '/metas/financeiro', label: 'Meta Financeiro' },
    { route: '/metas', label: 'Meta Faturamento' },
    { route: '/metas/pesquisas', label: 'Meta Pesquisas' },
    { route: '/metas/produtos', label: 'Meta Produtos' },
    { route: '/metas/qualidade/categorias', label: 'Categorias de Qualidade' },
    { route: '/metas/qualidade', label: 'Metas de Qualidade' },
    { route: '/metas/qualidade/realizado', label: 'Resultados de Qualidade' },
  ]
}
```

---

## Referências rápidas

- **Layout do dashboard:** `src/app/(dashboard)/layout.tsx`
- **Sidebar:** `src/components/layout/sidebar.tsx`
- **Header:** `src/components/layout/header.tsx`
- **Tipos:** `src/types/index.ts`
- **Hooks:** `src/hooks/` (useGroupFilter, usePagePermissions, etc.)

---

*Última atualização: Fevereiro 2025*
