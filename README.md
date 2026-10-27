# Nexo Fiscal

Sistema web de gestão fiscal, financeira e contábil para empresas brasileiras. Centraliza notas fiscais, contas a pagar e a receber, fluxo de caixa e a relação com o contador, e usa leitura inteligente de documentos para preparar lançamentos que o usuário confere antes de gravar.

## O que já funciona
- **Landing page** (`/`).
- **Dashboard** (`/app`): filtros globais que recalculam cards e gráficos a partir do mesmo conjunto de registros; cada indicador explica o próprio conceito e abre os registros que o compõem.
- **Notas Fiscais** (`/app/notas`): busca, filtros, paginação, exportação CSV e página de detalhes.
- **Leitura de documentos** (`/app/importar`): upload em lote, leitor real de XML de NF-e/NFC-e, validações de CNPJ/chave/datas/somas, deduplicação e conferência campo a campo.
- **Contas a pagar / a receber** (`/app/contas-a-pagar`, `/app/contas-a-receber`).
- Os demais módulos aparecem no menu com o que vão entregar e em qual etapa.

Nesta etapa, os dados são exemplos gerados de forma determinística em `src/data/fixtures.ts` (data de referência 16/10/2026).

## Tecnologias
- TanStack Start (React 19, roteamento por arquivos, SSR) na Netlify
- Tailwind CSS v4 (tema em `src/styles.css`)
- Chart.js via react-chartjs-2
- lucide-react (ícones)

## Executar localmente
```bash
pnpm install
netlify dev        # ou: pnpm dev
```

## Roadmap
O roadmap completo está em [PLAN.md](./PLAN.md). Próximas etapas: banco de dados, autenticação e permissões; núcleo financeiro persistido com armazenamento de documentos; recorrências e fluxo de caixa; leitura de PDF/OCR com IA no servidor; conciliação e relatórios; área do contador; central fiscal e assistente de IA.
