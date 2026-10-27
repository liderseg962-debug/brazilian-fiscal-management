# Nexo Fiscal — Roadmap do produto

O Nexo Fiscal é o centro de controle fiscal, financeiro e contábil de empresas brasileiras. O roadmap entrega uma etapa funcional e testada por vez, e cada uma se apoia na anterior. A prioridade é que todo número exibido seja **funcional, seguro, auditável e financeiramente consistente**.

## Etapa 1 — Superfície do produto ✅ (concluída)
- Landing page com a marca, a proposta e os princípios do produto.
- Layout do aplicativo com os 17 módulos no menu lateral, agrupados por área.
- **Dashboard**: filtros globais (mês/ano, intervalo, empresa/CNPJ, categoria, cliente/fornecedor, situação, tipo de movimentação, centro de custo), 11 indicadores com o conceito explicado e detalhamento dos registros, e os gráficos de receitas × despesas, saldo, fixas × variáveis, categoria, cliente, fornecedor e projeção de 30/60/90 dias.
- **Notas Fiscais**: lista com busca, filtros, paginação e exportação CSV, além de uma página de detalhes com os valores separados (bruto / líquido / previsto / pago), tributos e retenções, validações, arquivos e histórico.
- **Leitura de documentos**: upload em lote, painel de processamento, leitor real de XML de NF-e/NFC-e, validações determinísticas (CNPJ, chave de acesso, datas, somas), deduplicação e tela de conferência com confiança por campo, correção e trilha de alterações.
- **Contas a pagar** e **contas a receber** com previsto × realizado × em aberto e pagamentos parciais.
- Todos os dados vêm de um único módulo de dados de exemplo (`src/data/fixtures.ts`).

## Etapa 2 — Fundação: dados, acesso e auditoria
- Netlify Database (Postgres + Drizzle): empresas, usuários, associação usuário↔empresa, papéis e permissões, clientes, fornecedores, categorias (personalizáveis, com histórico), centros de custo, contas bancárias e logs de auditoria.
- Autenticação com Netlify Identity (login, recuperação de senha, sessão).
- Perfis Administrador, Financeiro, Gestor, Contador e Consulta, com permissões por módulo e ação (visualizar, cadastrar, editar, aprovar, exportar, excluir).
- Isolamento por empresa verificado no servidor em toda consulta (nenhum acesso entre empresas por troca de ID na URL ou na requisição).
- Telas: Equipe e Permissões, Configurações da Empresa (CNPJ, regime, CNAEs, inscrições), Clientes e Fornecedores, Auditoria e Histórico.

## Etapa 3 — Núcleo financeiro persistido + documentos
- Tabelas de notas fiscais, despesas, receitas, contas a pagar e a receber, parcelas e pagamentos/recebimentos (com parciais), usando valores em centavos inteiros.
- Troca dos fixtures por consultas no servidor com as mesmas formas de dados.
- Cadastro, edição, cancelamento e estorno com justificativa; nada confirmado é apagado em silêncio.
- Registro de pagamento e recebimento atualizando dashboard e fluxo realizado.
- Armazenamento privado dos XMLs, PDFs e comprovantes (Netlify Blobs) com links temporários; módulo Documentos e Arquivos.
- Testes automatizados das regras financeiras (`src/lib/finance.ts`, validadores, deduplicação).

## Etapa 4 — Recorrências e fluxo de caixa
- Despesas fixas e recorrentes (mensal, trimestral, semestral, anual) com geração idempotente de previsões, ajuste pontual de valor, pausa/encerramento e reajuste opcional.
- Fluxo de caixa diário, semanal e mensal: previsto × realizado, transferências entre contas próprias fora do resultado, calendário de vencimentos e simulação de cenários.
- Alertas de vencimento.

## Etapa 5 — Leitura com IA no servidor
- Função de servidor para PDFs e imagens: extração de texto, OCR para documentos digitalizados e estruturação dos campos por IA (Netlify AI Gateway, modelo Gemini com visão).
- Leiautes de XML de NFS-e (padrão nacional e municipais).
- Confiança por campo, campos ausentes sempre pendentes, sem valores inventados; as mesmas validações determinísticas da Etapa 1.
- Lote persistente com status por arquivo; gravação de extraído × corrigido × aprovado.
- Geração ou vínculo da conta a pagar/receber após a aprovação, sem nunca marcá-la como paga.

## Etapa 6 — Conciliação, relatórios e exportação
- Importação de extratos OFX/CSV, sugestões de correspondência, confirmação e rejeição, e registro do responsável.
- Relatórios gerenciais filtráveis com data de geração, e exportação em PDF, Excel/CSV.

## Etapa 7 — Área do contador e contabilidade
- Acesso restrito com prazo e revogação, solicitações de documentos, divergências e observações.
- Painel de fechamento mensal por estados.
- Pacote ZIP por empresa/ano/mês (notas, XMLs, PDFs, comprovantes, relatórios).
- Plano de contas configurável e lançamentos de débito/crédito vinculados a documentos (sem equiparar categorias financeiras a contas contábeis). Balanço patrimonial apenas com escrituração adequada e validação do responsável.

## Etapa 8 — Central fiscal e assistente de IA
- Regras tributárias versionadas (tributo, regime, operação, UF/município, vigência, fonte oficial, versão, revisor), preparadas para CBS/IBS.
- Cálculos estimados mostrando fórmula, base, premissas e data de referência.
- Central de pendências (documentos ausentes, duplicidades, canceladas, vencimentos, fechamento).
- Assistente financeiro em português sobre os dados autorizados, informando o período usado e as limitações; qualquer ação exige confirmação humana.

## Integrações externas (sob demanda)
SEFAZ/Receita, instituições financeiras e sistemas contábeis só aparecem como ativos quando estiverem realmente configurados, com credenciais e autorização do usuário.
