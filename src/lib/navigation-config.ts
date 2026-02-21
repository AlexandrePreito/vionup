/**
 * Configuração central de módulos e páginas do sistema.
 * Usada pela API /api/modules para listar permissões e pelo sidebar/header.
 * Ao adicionar um novo menu ou tela aqui, ele passa a aparecer automaticamente
 * na tela de permissões do usuário.
 */
export interface NavPage {
  route: string;
  label: string;
  display_order: number;
}

export interface NavModule {
  name: string;
  label: string;
  display_order: number;
  pages: NavPage[];
}

export const NAV_MODULES: NavModule[] = [
  {
    name: 'cadastros',
    label: 'Cadastros',
    display_order: 1,
    pages: [
      { route: '/cadastros/produtos', label: 'Produtos', display_order: 1 },
      { route: '/cadastros/funcionarios', label: 'Funcionários', display_order: 2 },
      { route: '/cadastros/turnos', label: 'Turnos', display_order: 3 },
      { route: '/cadastros/modo-venda', label: 'Modo de Venda', display_order: 4 },
      { route: '/cadastros/categorias', label: 'Categorias', display_order: 5 },
      { route: '/cadastros/responsaveis', label: 'Responsáveis', display_order: 6 },
    ],
  },
  {
    name: 'config',
    label: 'Configuração',
    display_order: 2,
    pages: [
      { route: '/grupos', label: 'Grupos', display_order: 1 },
      { route: '/empresas', label: 'Empresas', display_order: 2 },
      { route: '/usuarios', label: 'Usuários', display_order: 3 },
      { route: '/conciliacao/produtos', label: 'Conciliação Produtos', display_order: 4 },
      { route: '/conciliacao/categorias', label: 'Conciliação Categorias', display_order: 5 },
      { route: '/conciliacao/empresas', label: 'Conciliação Empresas', display_order: 6 },
      { route: '/conciliacao/funcionarios', label: 'Conciliação Funcionários', display_order: 7 },
    ],
  },
  {
    name: 'powerbi',
    label: 'Power BI',
    display_order: 3,
    pages: [
      { route: '/powerbi/conexoes', label: 'Conexões', display_order: 1 },
      { route: '/powerbi/sincronizacao', label: 'Sincronização', display_order: 2 },
    ],
  },
  {
    name: 'compras',
    label: 'Compras',
    display_order: 4,
    pages: [
      { route: '/compras/materias-primas', label: 'Matérias-Primas', display_order: 1 },
      { route: '/compras/projecao-revenda', label: 'Projeção Revenda', display_order: 2 },
      { route: '/compras/projecao-mp', label: 'Projeção MP', display_order: 3 },
      { route: '/compras/listas-compra', label: 'Listas de Compra', display_order: 4 },
    ],
  },
  {
    name: 'metas',
    label: 'Metas',
    display_order: 5,
    pages: [
      { route: '/metas/financeiro', label: 'Meta Financeiro', display_order: 1 },
      { route: '/metas', label: 'Meta Faturamento', display_order: 2 },
      { route: '/metas/pesquisas', label: 'Meta Pesquisas', display_order: 3 },
      { route: '/metas/produtos', label: 'Meta Produtos', display_order: 4 },
      { route: '/metas/qualidade/categorias', label: 'Categorias de Qualidade', display_order: 5 },
      { route: '/metas/qualidade', label: 'Metas de Qualidade', display_order: 6 },
      { route: '/metas/qualidade/realizado', label: 'Resultados de Qualidade', display_order: 7 },
    ],
  },
  {
    name: 'dashboard',
    label: 'Dashboard',
    display_order: 6,
    pages: [
      { route: '/dashboard-financeiro', label: 'Financeiro', display_order: 1 },
      { route: '/dashboard/realizado', label: 'Realizado', display_order: 2 },
      { route: '/dashboard/realizado-mes', label: 'Realizado por Mês', display_order: 3 },
      { route: '/dashboard/previsao', label: 'Previsão de Vendas', display_order: 4 },
      { route: '/dashboard/empresas', label: 'Empresas', display_order: 5 },
      { route: '/dashboard/empresa', label: 'Empresa', display_order: 6 },
      { route: '/dashboard/equipe', label: 'Equipe', display_order: 7 },
      { route: '/dashboard/funcionario', label: 'Funcionário', display_order: 8 },
      { route: '/dashboard/nps_interno', label: 'NPS (Interno)', display_order: 9 },
      { route: '/dashboard/nps', label: 'Dashboard NPS (Goomer)', display_order: 10 },
    ],
  },
  {
    name: 'nps',
    label: 'NPS',
    display_order: 7,
    pages: [
      { route: '/nps', label: 'Dashboard', display_order: 1 },
      { route: '/nps/pesquisas', label: 'Pesquisas', display_order: 2 },
      { route: '/nps/perguntas', label: 'Perguntas', display_order: 3 },
      { route: '/nps/links', label: 'QR Codes & Links', display_order: 4 },
      { route: '/nps/respostas', label: 'Respostas', display_order: 5 },
      { route: '/nps/configuracoes', label: 'Configurações', display_order: 6 },
    ],
  },
];
