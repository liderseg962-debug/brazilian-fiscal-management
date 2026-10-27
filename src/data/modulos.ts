import {
  ArrowDownCircle,
  ArrowUpCircle,
  BarChart3,
  Bot,
  Building2,
  CalendarClock,
  FileSearch,
  FileText,
  FolderArchive,
  GitCompareArrows,
  History,
  LayoutDashboard,
  Receipt,
  ScanText,
  Users,
  Wallet,
  Briefcase,
  type LucideIcon,
} from 'lucide-react'

export type Modulo = {
  slug: string
  /** Route path; built modules have their own route, the rest use /app/$modulo. */
  to: string
  titulo: string
  icone: LucideIcon
  resumo: string
  disponivel: boolean
  marco?: number
  recursos?: string[]
}

export type GrupoMenu = { titulo: string; modulos: Modulo[] }

export const menu: GrupoMenu[] = [
  {
    titulo: 'Visão geral',
    modulos: [
      { slug: 'dashboard', to: '/app', titulo: 'Dashboard', icone: LayoutDashboard, resumo: 'Visão executiva com filtros globais.', disponivel: true },
      {
        slug: 'assistente',
        to: '/app/assistente',
        titulo: 'Assistente de IA',
        icone: Bot,
        resumo: 'Perguntas em português sobre os dados autorizados da empresa, sempre com o período utilizado e sem inventar resultados.',
        disponivel: false,
        marco: 8,
        recursos: [
          'Consulta somente a dados que o usuário tem permissão de ver',
          'Informa o período e os filtros usados em cada resposta',
          'Declara quando não há dados suficientes',
          'Sugestões de ação sempre exigem confirmação humana',
        ],
      },
    ],
  },
  {
    titulo: 'Fiscal',
    modulos: [
      { slug: 'notas', to: '/app/notas', titulo: 'Notas Fiscais', icone: FileText, resumo: 'Documentos de entrada e saída.', disponivel: true },
      { slug: 'importar', to: '/app/importar', titulo: 'Leitura com IA', icone: ScanText, resumo: 'Upload, extração e conferência de documentos.', disponivel: true },
      {
        slug: 'central-fiscal',
        to: '/app/central-fiscal',
        titulo: 'Central Fiscal e Pendências',
        icone: FileSearch,
        resumo: 'Alertas de documentos ausentes, duplicidades, notas canceladas e regras tributárias versionadas por vigência.',
        disponivel: false,
        marco: 8,
        recursos: [
          'Regras tributárias versionadas: tributo, regime, operação, UF/município, vigência e fonte oficial',
          'Preparada para a transição CBS/IBS da Reforma Tributária',
          'Todo cálculo estimado exibe fórmula, base, premissas e data de referência',
          'Sinaliza quando a classificação exige validação do contador',
        ],
      },
      {
        slug: 'documentos',
        to: '/app/documentos',
        titulo: 'Documentos e Arquivos',
        icone: FolderArchive,
        resumo: 'Repositório privado de XMLs, PDFs, comprovantes e contratos, com links temporários.',
        disponivel: false,
        marco: 3,
        recursos: ['Armazenamento privado por empresa', 'Links de acesso temporários', 'Versões e original sempre preservados', 'Vínculo com notas, despesas e receitas'],
      },
    ],
  },
  {
    titulo: 'Financeiro',
    modulos: [
      { slug: 'contas-a-pagar', to: '/app/contas-a-pagar', titulo: 'Despesas e Contas a Pagar', icone: ArrowUpCircle, resumo: 'Obrigações, vencimentos e pagamentos.', disponivel: true },
      { slug: 'contas-a-receber', to: '/app/contas-a-receber', titulo: 'Receitas e Contas a Receber', icone: ArrowDownCircle, resumo: 'Títulos, recebimentos e inadimplência.', disponivel: true },
      {
        slug: 'fluxo-de-caixa',
        to: '/app/fluxo-de-caixa',
        titulo: 'Fluxo de Caixa',
        icone: Wallet,
        resumo: 'Visão diária, semanal e mensal com previsto × realizado, calendário de vencimentos e simulação de cenários.',
        disponivel: false,
        marco: 4,
        recursos: ['Saldo inicial, entradas e saídas previstas e realizadas', 'Transferências entre contas próprias fora do resultado', 'Projeções de 30, 60 e 90 dias', 'Simulação de atraso de recebimentos e aumento de despesas'],
      },
      {
        slug: 'recorrencias',
        to: '/app/recorrencias',
        titulo: 'Despesas Fixas e Recorrências',
        icone: CalendarClock,
        resumo: 'Compromissos mensais, trimestrais, semestrais e anuais com geração automática de previsões.',
        disponivel: false,
        marco: 4,
        recursos: ['Geração das previsões sem duplicidade', 'Ajuste de valor em um mês específico', 'Pausar ou encerrar contratos preservando o histórico', 'Nenhuma nota fiscal é gerada automaticamente'],
      },
      {
        slug: 'conciliacao',
        to: '/app/conciliacao',
        titulo: 'Conciliação Financeira',
        icone: GitCompareArrows,
        resumo: 'Importação de extratos OFX/CSV e sugestão de correspondências por data, valor e descrição.',
        disponivel: false,
        marco: 6,
        recursos: ['Importação OFX e CSV', 'Sugestões de vínculo para confirmar ou rejeitar', 'Movimentações sem classificação em destaque', 'Nada é alterado sem confirmação; responsável registrado'],
      },
    ],
  },
  {
    titulo: 'Cadastros e análises',
    modulos: [
      {
        slug: 'parceiros',
        to: '/app/parceiros',
        titulo: 'Clientes e Fornecedores',
        icone: Briefcase,
        resumo: 'Cadastro unificado com CNPJ/CPF validado e histórico de documentos por parceiro.',
        disponivel: false,
        marco: 2,
        recursos: ['Validação de CPF/CNPJ', 'Histórico de notas e lançamentos por parceiro', 'Variação de preços por fornecedor'],
      },
      {
        slug: 'relatorios',
        to: '/app/relatorios',
        titulo: 'Relatórios Gerenciais',
        icone: BarChart3,
        resumo: 'Relatórios filtráveis e exportáveis em PDF, Excel e CSV, com data de geração e detalhamento.',
        disponivel: false,
        marco: 6,
        recursos: ['Receitas × despesas, fluxo realizado e projetado', 'Por fornecedor, cliente, categoria e centro de custo', 'Diferencia resultado gerencial, saldo de caixa e lucro contábil', 'Totais sempre batem com os registros de origem'],
      },
    ],
  },
  {
    titulo: 'Contabilidade',
    modulos: [
      {
        slug: 'contador',
        to: '/app/contador',
        titulo: 'Área do Contador',
        icone: Receipt,
        resumo: 'Acesso restrito, com prazo, para o escritório contábil: documentos, fechamento mensal e solicitações.',
        disponivel: false,
        marco: 7,
        recursos: ['Painel de fechamento mensal por estados', 'Solicitação de documentos e registro de divergências', 'Exportação em ZIP organizada por empresa, ano e mês', 'Plano de contas e lançamentos de débito e crédito'],
      },
    ],
  },
  {
    titulo: 'Administração',
    modulos: [
      {
        slug: 'equipe',
        to: '/app/equipe',
        titulo: 'Equipe e Permissões',
        icone: Users,
        resumo: 'Perfis Administrador, Financeiro, Gestor, Contador e Consulta, com permissões por módulo e ação.',
        disponivel: false,
        marco: 2,
        recursos: ['Visualizar, cadastrar, editar, aprovar, exportar e excluir por módulo', 'Convites por e-mail', 'Acesso do contador com prazo e revogação'],
      },
      {
        slug: 'configuracoes',
        to: '/app/configuracoes',
        titulo: 'Configurações da Empresa',
        icone: Building2,
        resumo: 'CNPJ, regime tributário, CNAEs, inscrições, categorias, centros de custo e contas bancárias.',
        disponivel: false,
        marco: 2,
        recursos: ['Múltiplas empresas com isolamento de dados', 'MEI, Simples Nacional, Lucro Presumido e Lucro Real', 'Categorias personalizáveis sem perder histórico'],
      },
      {
        slug: 'auditoria',
        to: '/app/auditoria',
        titulo: 'Auditoria e Histórico',
        icone: History,
        resumo: 'Registro imutável de criações, alterações, aprovações, cancelamentos e acessos sensíveis.',
        disponivel: false,
        marco: 2,
        recursos: ['Quem, quando, o quê e valor anterior × novo', 'Estornos e cancelamentos sempre com justificativa', 'Filtro por usuário, módulo e período'],
      },
    ],
  },
]

export const todosModulos = menu.flatMap((g) => g.modulos)
export const moduloPorSlug = new Map(todosModulos.map((m) => [m.slug, m]))

