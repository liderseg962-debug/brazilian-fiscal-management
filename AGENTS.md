# Nexo Fiscal — guia para agentes

Sistema de gestão fiscal/financeira para empresas brasileiras (UI em pt-BR). **Continue a partir do [PLAN.md](./PLAN.md)**: a Etapa 1 (superfície do produto) está concluída; a próxima é a Etapa 2 (banco de dados, autenticação, permissões, auditoria).

## Arquitetura
- TanStack Start + React 19 na Netlify (`@netlify/vite-plugin-tanstack-start`). Rotas por arquivos em `src/routes/`; `src/routeTree.gen.ts` é gerado no build.
- `src/routes/index.tsx`: landing page. `src/routes/app.tsx`: layout do aplicativo (menu lateral + barra superior) com `<Outlet/>`.
- `src/routes/app/`: `index.tsx` (Dashboard), `notas/index.tsx`, `notas/$notaId.tsx`, `importar.tsx` (leitura e conferência), `contas-a-pagar.tsx`, `contas-a-receber.tsx`, `$modulo.tsx` (página dos módulos planejados, a partir de `src/data/modulos.ts`).
- `src/data/fixtures.ts`: **única fonte de dados** nesta etapa. Gerada de forma determinística (PRNG com seed), com `HOJE = 2026-10-16`. A Etapa 3 troca esses exports por consultas no servidor mantendo os mesmos tipos.
- `src/data/modulos.ts`: catálogo do menu (17 módulos). `disponivel: false` + `marco` faz o módulo cair na página de roadmap. Ao construir um módulo, crie a rota e mude para `disponivel: true`.
- `src/lib/finance.ts`: regras puras de filtros/agregações usadas por cards, gráficos e tabelas, garantindo que todos usem o mesmo conjunto de registros.
- `src/lib/nfe-xml.ts`: leitor de XML de NF-e no navegador, validações e deduplicação. `src/lib/fiscal-validators.ts`: CNPJ/CPF e chave de acesso (módulo 11).
- `src/components/`: `ui.tsx` (Card, Badge, status, Botao…), `Charts.tsx` (Chart.js montado apenas no cliente, com tabela acessível), `Lancamentos.tsx`, `Logo.tsx`.

## Convenções
- Dinheiro sempre em **centavos inteiros** (`Cents`); formatação via `brl()`. Datas como strings ISO `YYYY-MM-DD`, exibidas com `dataBR()` (DD/MM/AAAA). Nada de `Date` com fuso nas regras.
- Separar conceitos: competência (lançado) × data de pagamento (realizado) × vencimento (em aberto). Valor bruto da nota × valor líquido informado × valor financeiro previsto × valor pago são campos distintos.
- Notas canceladas ficam no histórico, mas não entram nos totais (`cancelado`/`status === 'Cancelada'`).
- A importação nunca marca pagamento. A obrigação só nasce após a aprovação da conferência.
- A IA sugere e não inventa: campo ausente = `null` + `motivo`; confiança < 0,8 exige confirmação.
- Não exibir integrações como ativas se não estiverem implementadas. Nada de botões decorativos.
- Cores: navy (base), `ok-*` verde (regular/recebido), `warn-*` âmbar (pendência), `risk-*` vermelho (atraso/erro). Tokens em `src/styles.css`.
- Persistência futura: Netlify Database (Drizzle, `db/schema.ts`) para registros; Netlify Blobs para arquivos; Netlify Identity para autenticação; AI Gateway para IA.

## Decisões não óbvias
- O saldo gerencial é calculado com `SALDO_ABERTURA` + movimentos registrados e rotulado como "não conciliado".
- A previsão de recebimento de NFS-e com retenções usa o líquido das retenções destacadas, não o bruto.
- Notas "em conferência" dos fixtures não têm lançamento vinculado, de propósito.
- A aprovação na tela de importação vale apenas para a sessão até a Etapa 3, e a interface informa isso.
