# Vion Up! - Sistema de Gestão de Metas

Sistema completo de gestão empresarial com foco em metas, previsões, compras e análise de dados.

## 🚀 Tecnologias

- **Next.js 16** - Framework React com App Router
- **TypeScript** - Tipagem estática
- **Supabase** - Backend e banco de dados
- **Tailwind CSS** - Estilização
- **Recharts** - Gráficos e visualizações
- **Lucide React** - Ícones

## 📋 Funcionalidades

### Dashboard
- **Previsão de Vendas**: Projeções baseadas em histórico com cenários otimista, realista e pessimista; meta da empresa com indicador “bate/não bate” por cenário; salvar projeção e acompanhar vs realizado (gráfico e tabela dia a dia)
- **Dashboard Empresa**: Visão geral de metas e realizações por modo de venda e turno
- **Dashboard Financeiro**: Metas por categoria (entradas/saídas)
- **NPS Dashboard**: Análise de satisfação do cliente com comentários e pesquisas

### Metas
- Gestão de metas por funcionário, turno e modo de venda
- Metas de produtos com distribuição entre funcionários
- Metas financeiras (entradas/saídas por categoria) e responsáveis
- Importação em massa via Excel
- Clonagem de metas entre períodos

### Compras
- Projeção de revenda com cálculo automático de quantidades
- Gestão de matérias-primas
- Projeção de matérias-primas baseada em vendas

### Cadastros
- Empresas e grupos
- Produtos e categorias
- Funcionários
- Responsáveis (metas financeiras)
- Turnos e modos de venda
- Usuários e permissões

### Power BI
- Sincronização de dados com Power BI
- Configuração de conexões e datasets
- Sincronização incremental e agendada

### Importação
- Importação de dados Goomer (NPS, comentários, scores)
- Importação de funcionários via Excel

## 🛠️ Instalação

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/vionup.git
cd vionup
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.example .env.local
```

Edite `.env.local` com suas credenciais do Supabase:
```
NEXT_PUBLIC_SUPABASE_URL=sua_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anon
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role
```

4. Execute as migrações do Supabase:
```bash
npx supabase migration up
```

5. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000)

## 📁 Estrutura do Projeto

```
vionup/
├── src/
│   ├── app/              # Rotas e páginas (Next.js App Router)
│   │   ├── (dashboard)/  # Páginas do dashboard
│   │   ├── api/          # API Routes
│   │   └── login/        # Página de login
│   ├── components/       # Componentes React
│   ├── contexts/         # Contextos React (Auth, Toast, Sidebar)
│   ├── lib/              # Utilitários e helpers
│   └── types/            # Tipos TypeScript
├── supabase/
│   └── migrations/       # Migrações do banco de dados
└── sql/                  # Scripts SQL adicionais
```

## 🔐 Autenticação

O sistema possui 3 níveis de permissão:
- **Master**: Acesso total ao sistema
- **Admin**: Administrador do grupo, acesso a configurações
- **User**: Acesso apenas às empresas vinculadas

## 📚 Documentação

- **[Documentação do Sistema](docs/DOCUMENTACAO_SISTEMA.md)** — Sincronização Power BI e Dashboards (visão geral, fluxos, APIs)
- **[Sincronização Power BI (completa)](docs/SINCRONIZACAO_POWERBI_COMPLETA.md)** — Detalhes técnicos da sincronização
- **[Sincronização Power BI (resumo)](docs/SINCRONIZACAO_POWERBI.md)** — Status e configuração

## 📊 Banco de Dados

O sistema utiliza Supabase (PostgreSQL) com as seguintes tabelas principais:
- `users` - Usuários do sistema
- `company_groups` - Grupos de empresas
- `companies` - Empresas
- `products` - Produtos
- `employees` - Funcionários
- `sales_goals` - Metas de vendas (faturamento, turno, modo, produtos)
- `saved_projections` - Projeções de previsão salvas (acompanhamento vs realizado)
- `financial_goals` - Metas financeiras por categoria
- `external_cash_flow` - Fluxo de caixa externo
- `goomer_*` - Dados do Goomer (NPS, feedbacks, etc.)

## 🚀 Deploy

### Vercel (Recomendado)

1. Conecte seu repositório GitHub à Vercel
2. Configure as variáveis de ambiente
3. Deploy automático a cada push

### Outros provedores

O projeto pode ser deployado em qualquer plataforma que suporte Next.js:
- Netlify
- Railway
- AWS Amplify
- DigitalOcean App Platform

## 📝 Licença

Este projeto é privado e proprietário.

## 👥 Contribuindo

Este é um projeto privado. Para contribuições, entre em contato com a equipe de desenvolvimento.

## 📧 Contato

Para dúvidas ou suporte, entre em contato com a equipe de desenvolvimento.

---

Desenvolvido com ❤️ pela equipe Vion Up!
