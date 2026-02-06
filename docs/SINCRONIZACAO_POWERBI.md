# Documentação - Sincronização Power BI

## Visão Geral

O sistema de sincronização Power BI permite importar dados diretamente de datasets do Power BI para o banco de dados do sistema. A sincronização suporta diferentes tipos de entidades (Empresas, Funcionários, Produtos, Vendas, Caixa, etc.) e oferece três modos de sincronização: **Incremental**, **Completa** e **Inicial**.

## Status Atual do Sistema

### ✅ Funcionalidades Implementadas

O sistema de sincronização está **totalmente funcional** e operacional com as seguintes capacidades:

1. **Sincronização de Múltiplas Entidades**
   - 8 tipos de entidades suportadas (Empresas, Funcionários, Produtos, Vendas, Caixa, Fluxo de Caixa, Categorias, Estoque)
   - Suporte para entidades incrementais e não-incrementais

2. **Três Modos de Sincronização**
   - 🟢 **Incremental**: Atualiza apenas os últimos N dias (não deleta histórico)
   - 🔵 **Completa**: Recarrega período completo (deleta e reinsere)
   - 🟡 **Inicial**: Primeira sincronização de uma entidade

3. **Processamento em Lotes**
   - Processamento otimizado para entidades grandes (Vendas e Caixa)
   - Divisão automática em lotes por período configurável
   - Processamento assíncrono que continua mesmo após sair da página

4. **Sistema de Lock Global**
   - Prevenção de múltiplas sincronizações simultâneas
   - Modal de confirmação ao tentar iniciar nova sync durante execução

5. **Monitoramento em Tempo Real**
   - Acompanhamento de progresso com atualização a cada 2 segundos
   - Exibição de lotes processados, registros salvos e percentual de conclusão
   - Painel lateral com detalhes completos da sincronização

6. **Agendamento Automático**
   - Sincronizações agendadas (diárias ou semanais)
   - Múltiplos agendamentos por entidade

7. **Logs e Auditoria**
   - Histórico completo de sincronizações
   - Estatísticas por empresa
   - Detalhamento de erros e sucessos

## Últimas Mudanças e Melhorias

### 🔄 Mudanças Recentes (2025)

#### 1. **Configuração de Dias por Lote** (Nova Funcionalidade)
- **Adicionado:** Campo `days_per_batch` nas configurações de sincronização
- **Propósito:** Permitir controle fino sobre o tamanho dos lotes processados
- **Benefício:** Otimização de performance e redução de timeouts
- **Valor padrão:** 7 dias
- **Recomendação:** 2-5 dias para volumes grandes

#### 2. **Estratégias de Sincronização Otimizadas**
- **DELETE + INSERT** para sincronizações completas e iniciais
  - Deleta período completo antes de inserir novos dados
  - Garante alinhamento 100% com Power BI
  - Fallback automático para deleção dia-a-dia em caso de timeout

- **MICRO-UPSERT** para sincronizações incrementais
  - Processa em micro-lotes de 500 registros
  - Atualiza registros existentes ou insere novos
  - Não deleta dados históricos
  - Retry automático em caso de falhas temporárias

#### 3. **Melhorias no Processamento de Entidades Grandes**
- **Processamento em Lotes por Período**
  - Divisão automática do período em lotes configuráveis
  - Processamento sequencial com atualização de progresso
  - Tratamento de erros por lote (continua mesmo com falhas parciais)

- **Otimização de Batch Sizes**
  - Full Sync: 2000 registros por lote (com fallback: 1000, 500)
  - Incremental: 500 registros por lote
  - Delay configurável entre lotes (50ms padrão)

#### 4. **Sistema de Lock Global**
- **Implementado:** Prevenção de múltiplas sincronizações simultâneas
- **Comportamento:** 
  - Ao tentar iniciar nova sync durante execução, exibe modal de confirmação
  - Opção de parar sync atual e iniciar nova
  - Lock liberado automaticamente ao finalizar

#### 5. **Melhorias na Interface**
- **Painel Lateral de Detalhes**
  - Visualização completa de informações da sincronização
  - Estatísticas por empresa
  - Histórico de sincronizações
  - Informações de período e total de registros

- **Indicadores Visuais**
  - Progresso em tempo real durante sincronização
  - Badges de status (Configurado, Em execução, Erro)
  - Indicador de dias incrementais configurados

#### 6. **Campo Período Adicionado**
- **Adicionado:** Campo `period` nas tabelas `external_sales` e `external_cash_flow`
- **Propósito:** Armazenar período da transação (ex: "Almoço", "Jantar")
- **Migração:** `add_period_fields_to_sync_configs.sql`

#### 7. **Melhorias no Tratamento de Erros**
- **Retry Automático:** Até 3 tentativas em caso de timeout
- **Fallback Progressivo:** Redução automática do tamanho do lote em caso de erro
- **Continuação de Processamento:** Sistema continua mesmo com falhas parciais em lotes
- **Logs Detalhados:** Registro de todos os erros para análise posterior

#### 8. **Otimizações de Performance**
- **Deleção Otimizada:** Tentativa de deletar período completo, com fallback para dia-a-dia
- **Refresh de Views:** Atualização automática de materialized views após sincronização
- **Processamento Assíncrono:** Sincronização continua no servidor mesmo após sair da página

### 📊 Status Técnico

#### Arquitetura Atual
- **Backend:** Next.js API Routes (`/api/powerbi/sync`)
- **Frontend:** React com hooks customizados
- **Banco de Dados:** Supabase (PostgreSQL)
- **Autenticação:** Azure AD Service Principal

#### Tabelas Principais
- `powerbi_connections` - Conexões Power BI
- `powerbi_sync_configs` - Configurações de sincronização
- `powerbi_sync_logs` - Logs de execução
- `powerbi_sync_schedules` - Agendamentos automáticos
- `external_*` - Tabelas de dados sincronizados

#### Configurações Disponíveis
- `days_per_batch` - Dias processados por lote (padrão: 7)
- `incremental_days` - Dias para sincronização incremental (padrão: 7)
- `initial_date` - Data inicial para primeira sincronização
- `date_field` - Campo de data no Power BI
- `is_incremental` - Habilita sincronização incremental

### 🎯 Próximas Melhorias Planejadas

1. **Fila de Sincronizações**
   - Sistema de fila para processar múltiplas sincronizações sequencialmente
   - Priorização de sincronizações

2. **Notificações**
   - Alertas por email/Slack ao finalizar sincronizações
   - Notificações de erros críticos

3. **Dashboard de Monitoramento**
   - Visão consolidada de todas as sincronizações
   - Métricas de performance e saúde do sistema

4. **Validação de Dados**
   - Verificação de integridade antes de salvar
   - Alertas de inconsistências

## Tipos de Sincronização

### 🟢 Sincronização Incremental (Botão Verde)

**Quando usar:** Para atualizar apenas os dados mais recentes sem apagar registros antigos.

**Comportamento:**
- Atualiza apenas os últimos **N dias** (configurado em "Dias para Atualização Incremental")
- Usa `UPSERT` - atualiza registros existentes ou insere novos
- **NÃO deleta** registros antigos
- Ideal para sincronizações diárias ou frequentes

**Exemplo:** Se configurado para 7 dias, sincronizará apenas os registros dos últimos 7 dias, mantendo todos os dados anteriores intactos.

### 🔵 Sincronização Completa (Botão Azul)

**Quando usar:** Para recriar completamente os dados de um período específico.

**Comportamento:**
- Sincroniza o período completo a partir da **Data Inicial** configurada até hoje
- **DELETA** todos os registros do período antes de inserir os novos
- Garante que os dados no sistema estejam 100% alinhados com o Power BI
- Use quando houver necessidade de corrigir dados históricos ou recriar o dataset

**Exemplo:** Se a Data Inicial for 01/01/2025, deletará todos os registros de 01/01/2025 até hoje e reinserirá tudo do Power BI.

### 🟡 Sincronização Inicial

**Quando usar:** Primeira vez que uma entidade é sincronizada.

**Comportamento:**
- Executada automaticamente na primeira sincronização
- Usa a **Data Inicial** configurada como ponto de partida
- Sincroniza do início até hoje
- Não deleta nada (é a primeira vez)

## Entidades Suportadas

### Cadastros (Não Incrementais)
- **Empresas** (`companies`)
- **Funcionários** (`employees`)
- **Produtos** (`products`)
- **Categorias** (`categories`)
- **Estoque** (`stock`)

### Transacionais (Incrementais)
- **Vendas** (`sales`) - Suporta sincronização incremental
- **Caixa** (`cash_flow`) - Suporta sincronização incremental
- **Fluxo de Caixa** (`cash_flow_statement`) - Suporta sincronização incremental

## Configuração

### Passo 1: Criar Conexão Power BI

1. Acesse `/powerbi/conexoes`
2. Clique em "Nova Conexão"
3. Preencha:
   - **Nome:** Nome identificador da conexão
   - **Workspace ID:** ID do workspace no Power BI
   - **Dataset ID:** ID do dataset que será sincronizado
   - **Client ID** e **Client Secret:** Credenciais da aplicação Azure AD

### Passo 2: Configurar Sincronização

1. Acesse `/powerbi/sincronizacao`
2. Selecione a conexão desejada
3. Clique em "Configurar" na entidade desejada
4. Preencha os campos:

#### Campos Obrigatórios
- **Dataset:** Selecione o dataset do Power BI
- **Nome da Tabela:** Nome da tabela no Power BI (ex: `VendaItemGeral`)
- **Campos Obrigatórios:** Dependem da entidade (geralmente incluem IDs e campos de data)

#### Mapeamento de Campos
- Para cada campo do sistema, informe o nome da coluna correspondente no Power BI
- Campos com 📊 aceitam medidas ou expressões DAX
- Exemplo:
  - `external_id` → `IdVenda`
  - `quantity` → `[Quantidades]` ou `SUM(Quantidades)`
  - `total_value` → `[Vendas Valor]`

#### Configuração Incremental (Apenas para Vendas, Caixa e Fluxo de Caixa)

1. Marque "Sincronização Incremental"
2. Preencha:
   - **Campo de Data no Power BI:** Nome da coluna de data (ex: `dt_contabil`)
   - **Data Inicial:** Data a partir da qual os dados serão sincronizados na primeira vez
   - **Dias para Atualização Incremental:** Quantos dias serão sincronizados nas atualizações incrementais (padrão: 7)
   - **Dias por Lote:** Quantidade de dias processados por lote (padrão: 7, recomendado: 2-5 para volumes grandes)
     - Valores menores reduzem risco de timeout mas aumentam número de requisições
     - Valores maiores são mais eficientes mas podem causar timeout em volumes muito grandes

### Passo 3: Executar Sincronização

#### Botão Verde (Incremental)
- Clique no botão verde ▶️
- Sincroniza apenas os últimos N dias
- Não apaga registros antigos
- Ideal para uso diário

#### Botão Azul (Completa)
- Clique no botão azul ▶️ (aparece apenas se incremental estiver habilitado)
- Sincroniza o período completo
- Deleta e recria os dados do período
- Use com cuidado - pode demorar muito tempo

## Fluxo de Dados

### Para Entidades Pequenas (Empresas, Funcionários, Produtos, etc.)

1. Executa query DAX no Power BI
2. Filtra por data (se incremental)
3. Transforma dados conforme mapeamento
4. Valida campos obrigatórios
5. Executa `UPSERT` no banco de dados

### Para Entidades Grandes (Vendas, Caixa)

1. Divide o período em lotes configuráveis (padrão: 7 dias, configurável via `days_per_batch`)
2. Para cada lote:
   - Executa query DAX com filtro de data específico do lote
   - Processa e valida registros
   - **Sincronização Completa/Inicial:** Executa `DELETE` do período + `INSERT` em lotes de 2000 registros (com fallback)
   - **Sincronização Incremental:** Executa `UPSERT` em micro-lotes de 500 registros
3. Atualiza progresso em tempo real (a cada lote processado)
4. Atualiza materialized views ao finalizar
5. Registra logs detalhados com estatísticas de processamento

## Agendamento Automático

Você pode agendar sincronizações automáticas:

1. Clique em "Adicionar" na coluna "Agendamentos"
2. Configure:
   - **Frequência:** Diária ou Semanal
   - **Dia da Semana:** (se semanal)
   - **Horário:** Hora em que a sincronização será executada
3. O sistema executará automaticamente a sincronização incremental no horário configurado

## Logs e Monitoramento

### Visualizar Logs
- Os logs de sincronização são salvos automaticamente
- Incluem:
  - Status (sucesso/erro)
  - Quantidade de registros processados
  - Duração da sincronização
  - Mensagens de erro (se houver)

### Campos de Status
- **Configurado:** Entidade está configurada e pronta para sincronizar
- **Última Sync:** Data e hora da última sincronização
- **Registros:** Quantidade de registros sincronizados na última execução

## Troubleshooting

### Erro: "Configuração não encontrada"
- Verifique se a conexão está ativa
- Certifique-se de que a configuração foi salva corretamente

### Erro: "Erro ao executar query DAX"
- Verifique se o nome da tabela está correto
- Confirme que os campos mapeados existem no Power BI
- Para campos DAX, verifique a sintaxe (ex: `[Medida]` ou `SUM(Coluna)`)

### Sincronização muito lenta
- Para Vendas e Caixa, o sistema processa em lotes automaticamente
- Sincronizações completas podem demorar muito tempo dependendo do volume
- Considere usar sincronização incremental para atualizações frequentes

### Dados não aparecem após sincronização
- Verifique os logs para identificar erros
- Confirme que os campos obrigatórios estão mapeados corretamente
- Verifique se os dados existem no Power BI para o período configurado

### Registros antigos foram apagados
- **Botão Verde (Incremental):** Não deveria apagar nada - verifique os logs
- **Botão Azul (Completa):** Comportamento esperado - deleta o período antes de reinserir

## Boas Práticas

1. **Use Incremental para uso diário:** Mais rápido e não apaga dados antigos
2. **Use Completa apenas quando necessário:** Para corrigir dados ou recriar o dataset
3. **Configure Data Inicial adequadamente:** Evite datas muito antigas para não processar dados desnecessários
4. **Monitore os logs:** Acompanhe as sincronizações para identificar problemas rapidamente
5. **Teste em ambiente de desenvolvimento:** Antes de configurar em produção, teste a sincronização

## Campos Especiais

### Campos DAX (📊)
Alguns campos aceitam medidas ou expressões DAX:
- **Medidas:** `[NomeMedida]`
- **Agregações:** `SUM(Coluna)`, `COUNT(Coluna)`, etc.
- **Expressões:** Qualquer expressão DAX válida

### Campos de Data
- Devem estar no formato reconhecido pelo Power BI
- O sistema converte automaticamente para formato de data do banco

### Campos Numéricos
- Quantidades, valores e custos são convertidos automaticamente para números
- Valores vazios ou inválidos são tratados como 0

## Estrutura de Dados

### Tabelas de Destino
- `external_companies` - Empresas
- `external_employees` - Funcionários
- `external_products` - Produtos
- `external_sales` - Vendas
- `external_cash_flow` - Caixa
- `external_cash_flow_statement` - Fluxo de Caixa
- `external_categories` - Categorias
- `external_stock` - Estoque

### Campos Comuns
Todas as tabelas incluem:
- `company_group_id` - ID do grupo da empresa
- `external_id` - ID único do registro no Power BI
- `raw_data` - Dados brutos retornados do Power BI (JSON)

## Limitações

1. **Volume de Dados:** Sincronizações muito grandes podem demorar várias horas
2. **Rate Limiting:** O Power BI pode limitar requisições muito frequentes
3. **Dependência de Conexão:** Requer conexão ativa com o Power BI
4. **Campos Obrigatórios:** Todos os campos marcados como obrigatórios devem estar mapeados

## Suporte

Em caso de problemas:
1. Verifique os logs de sincronização
2. Confirme as configurações da conexão
3. Valide os mapeamentos de campos
4. Teste a query DAX diretamente no Power BI

---

## Changelog

### Versão Atual (Janeiro 2025)

**Última atualização:** Janeiro 2025

#### Mudanças Implementadas:
- ✅ Adicionado campo `days_per_batch` para controle de tamanho de lotes
- ✅ Implementado sistema de lock global para prevenir sincronizações simultâneas
- ✅ Melhorias no processamento de entidades grandes com estratégias otimizadas
- ✅ Adicionado painel lateral de detalhes com estatísticas completas
- ✅ Implementado campo `period` para vendas e caixa
- ✅ Melhorias no tratamento de erros com retry automático
- ✅ Otimizações de performance com fallback progressivo
- ✅ Processamento assíncrono que continua no servidor

#### Status:
- 🟢 Sistema totalmente funcional e operacional
- 🟢 Todas as funcionalidades principais implementadas
- 🟢 Testado e validado em produção
