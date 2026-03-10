# Guia Tecnico - ValetTracker

## 1. Objetivo deste documento

Este arquivo serve como referencia rapida para quem vai manter ou evoluir a aplicacao ValetTracker.

Aqui voce encontra:

- o que precisa estar instalado;
- como rodar a aplicacao;
- os comandos essenciais;
- como a arquitetura esta organizada;
- qual pasta ou arquivo mexe em cada parte da aplicacao;
- observacoes importantes para evitar erro de entendimento.

## 2. Visao geral da aplicacao

O projeto atual e um frontend React + TypeScript criado com Vite.

Hoje ele funciona como um painel de operacao de valet com foco em:

- dashboard operacional;
- controle de veiculos;
- controle de manobristas;
- mapa de vagas;
- visao financeira;
- simulacao de perfis de acesso.

Ponto importante:

- neste repositorio nao existe backend real;
- os dados sao mockados em memoria em `src/data/mockDb.ts`;
- toda alteracao feita pela interface se perde ao recarregar a pagina;
- a camada `src/services/valetApi.ts` simula uma API com atraso artificial.

## 3. O que precisa instalar

Para trabalhar neste projeto, o minimo necessario e:

- Node.js 18+ (recomendado Node 20+)
- npm 9+ ou npm 10+
- Git
- um editor como VS Code

Opcional, mas util:

- extensao ESLint
- extensao Tailwind CSS IntelliSense
- terminal PowerShell

## 4. Como rodar o projeto

### 4.1 Instalar dependencias

```bash
npm install
```

### 4.2 Rodar em desenvolvimento

```bash
npm run dev
```

Por padrao o projeto usa Vite e sobe na porta `8080`.

### 4.3 Gerar build de producao

```bash
npm run build
```

### 4.4 Visualizar build localmente

```bash
npm run preview
```

### 4.5 Rodar testes

```bash
npm run test
```

### 4.6 Rodar testes em modo observacao

```bash
npm run test:watch
```

### 4.7 Rodar lint

```bash
npm run lint
```

## 5. Comandos essenciais

```bash
npm install
npm run dev
npm run build
npm run preview
npm run test
npm run test:watch
npm run lint
```

## 6. Fluxo tecnico da aplicacao

O fluxo principal hoje e este:

1. `index.html` entrega o container HTML base com `<div id="root"></div>`.
2. `src/main.tsx` monta o React dentro do `#root`.
3. `src/App.tsx` configura providers globais:
   - React Query
   - AuthProvider
   - TooltipProvider
   - Toasters
   - Router
4. As rotas carregam as paginas em `src/pages`.
5. Cada pagina monta o layout com `MainLayout` e `Sidebar`.
6. As paginas buscam dados pelos hooks de `src/hooks/useValetData.ts`.
7. Os hooks chamam a camada `src/services/valetApi.ts`.
8. A `valetApi` le e altera os arrays mockados em `src/data/mockDb.ts`.
9. A tela re-renderiza com os novos dados cacheados pelo React Query.

## 7. Perfis de acesso atuais

Hoje os perfis existentes no codigo sao:

- `admin`
- `attendant`
- `cashier`

Eles estao definidos em:

- `src/types/auth.ts`
- `src/auth/permissions.ts`
- `src/contexts/AuthContext.tsx`

Observacao importante para negocio:

- o papel "Supervisor" ainda nao existe tecnicamente;
- hoje o papel mais proximo de Supervisor Geral e o `admin`;
- se o primeiro usuario real sera o Supervisor de todos os contratos, o proximo passo ideal e criar um papel explicito chamado `supervisor` e adaptar permissoes, filtros por unidade e visoes consolidadas por patio.

## 8. Estrutura do projeto e responsabilidade de cada pasta/arquivo

## 8.1 Raiz do projeto

### `package.json`

Centraliza:

- nome do projeto;
- scripts principais;
- dependencias do frontend;
- dependencias de testes, lint e build.

### `package-lock.json`

Trava as versoes instaladas pelo npm.

### `bun.lockb`

Arquivo de lock do Bun. Nao e essencial se o projeto for mantido apenas com npm.

### `README.md`

README padrao do Lovable. Hoje esta generico e nao descreve a aplicacao de forma tecnica suficiente.

### `index.html`

Arquivo HTML base da aplicacao.

Se voce quiser mudar:

- favicon;
- metatags;
- titulo da aba;
- descricao da pagina;
- fonts carregadas via `<link>`;

e aqui que voce mexe.

### `vite.config.ts`

Configura o Vite:

- servidor de dev;
- alias `@` para `src`;
- chunks de build;
- plugin React SWC;
- plugin do Lovable em desenvolvimento.

Atencao:

- existe um `hmr.host` fixo em `192.168.1.59`;
- se rodar em outra maquina/rede, isso pode precisar ser ajustado.

### `vitest.config.ts`

Configura o ambiente de testes com:

- `jsdom`;
- alias `@`;
- arquivo de setup;
- padrao de descoberta de testes.

### `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`

Configuracoes TypeScript do projeto.

### `tailwind.config.ts`

Configura tema, cores, fontes, animacoes e extensoes do Tailwind.

### `postcss.config.js`

Liga o Tailwind/PostCSS no processo de build.

### `eslint.config.js`

Configura as regras de lint.

### `components.json`

Arquivo de configuracao do ecossistema `shadcn/ui`.

## 8.2 Pasta `public/`

Arquivos estaticos servidos direto pelo Vite.

### `public/LogoValetTracker*.ico`

Variacoes de favicon/icone da aplicacao.

### `public/placeholder.svg`

SVG generico de apoio visual.

### `public/robots.txt`

Arquivo padrao de orientacao para indexadores.

## 8.3 Pasta `src/`

Contem todo o codigo-fonte do frontend.

### `src/main.tsx`

Ponto de entrada do React.

### `src/App.tsx`

Arquivo mais importante do bootstrap da aplicacao.

Ele organiza:

- providers globais;
- roteamento;
- lazy loading das paginas;
- protecao de rotas por papel.

### `src/App.css`

CSS padrao sobrando do template inicial do Vite.

Na pratica, quase toda a interface atual usa `src/index.css` e classes Tailwind. Este arquivo parece legado e pode ser revisado depois.

### `src/index.css`

Arquivo principal de estilo global.

Aqui ficam:

- variaveis de cor;
- tema visual dark;
- gradientes;
- sombras;
- classes utilitarias proprietarias como `stat-card`, `status-available`, `data-table`;
- scrollbar customizada;
- animacoes.

Se o objetivo for alterar a identidade visual global do sistema, este e um dos primeiros arquivos para mexer.

## 8.4 Pasta `src/pages/`

Cada arquivo aqui representa uma tela principal da aplicacao.

### `src/pages/Index.tsx`

Pagina raiz `/`.

Ela apenas injeta o `Dashboard` dentro do `MainLayout`.

### `src/pages/Dashboard.tsx`

Tela principal do sistema.

Renderiza:

- cards de resumo;
- acoes rapidas;
- graficos de receita e ocupacao;
- mapa do patio;
- feed de atividades;
- veiculos em atendimento;
- manobristas do turno;
- dialogs de nova entrada, saida e novo cliente.

Se voce quiser mexer no "HTML" ou composicao visual do dashboard, este e o arquivo central.

### `src/pages/VehiclesPage.tsx`

Tela da aba Veiculos.

Responsavel por:

- busca por placa/cliente/modelo;
- filtros por status;
- alternancia grade/lista;
- abertura de dialogs de entrada, saida, detalhes e vistoria;
- acao de solicitar veiculo;
- acao de limpar base mockada de carros;
- envio de SMS via `sms:` para o cliente.

Se a alteracao e na tela principal de veiculos, o ponto de entrada e este arquivo.

### `src/pages/AttendantsPage.tsx`

Tela da aba Manobristas.

Responsavel por:

- busca por nome;
- filtro por status;
- cards da equipe;
- indicadores de online e jornada excedida;
- alerta visual/toast de jornada acima do limite;
- abertura dos dialogs de cadastro e detalhes;
- limpeza da base mockada de manobristas.

Se a alteracao e na tela principal dos manobristas, este e o arquivo principal.

### `src/pages/ParkingMapPage.tsx`

Tela da aba Mapa do Patio.

Renderiza:

- resumo de vagas;
- taxa de ocupacao;
- componente visual do mapa.

### `src/pages/FinancialPage.tsx`

Tela da aba Financeiro.

Renderiza:

- cards financeiros;
- grafico de receita;
- distribuicao por forma de pagamento;
- tabela de transacoes recentes.

### `src/pages/NotFound.tsx`

Tela fallback para rota inexistente.

## 8.5 Pasta `src/components/layout/`

Componentes estruturais da interface.

### `src/components/layout/MainLayout.tsx`

Layout base das paginas autenticadas:

- sidebar fixa;
- area principal rolavel.

### `src/components/layout/Sidebar.tsx`

Controla a navegacao lateral.

Tambem concentra:

- logo/nome do sistema;
- menu principal;
- menu inferior;
- contador de veiculos;
- seletor de papel atual do usuario;
- estado colapsado/expandido.

Se voce quiser mudar a navegacao, atalhos, rotulos do menu ou perfil visivel do usuario, mexa aqui.

## 8.6 Pasta `src/components/auth/`

### `src/components/auth/ProtectedRoute.tsx`

Bloqueia acesso a rotas com base nos papeis permitidos.

## 8.7 Pasta `src/components/dashboard/`

Componentes visuais reutilizados principalmente no dashboard e em telas relacionadas.

### `src/components/dashboard/ActivityFeed.tsx`

Lista o historico de eventos operacionais.

### `src/components/dashboard/AttendantCard.tsx`

Card visual de manobrista com status, informacoes e possiveis acoes.

Tambem e reutilizado na tela de manobristas.

### `src/components/dashboard/OccupancyChart.tsx`

Grafico de ocupacao por horario.

### `src/components/dashboard/ParkingMap.tsx`

Renderizacao visual do mapa de vagas.

Tambem aparece no dashboard e na pagina dedicada do patio.

### `src/components/dashboard/QuickActions.tsx`

Bloco de botoes de acao rapida do dashboard.

### `src/components/dashboard/RevenueChart.tsx`

Grafico de receita.

### `src/components/dashboard/StatCard.tsx`

Card padrao de metrica/resumo.

### `src/components/dashboard/VehicleStatusCard.tsx`

Card visual do veiculo.

E reutilizado:

- no dashboard;
- na pagina de veiculos.

## 8.8 Pasta `src/components/forms/`

Aqui ficam os dialogs/formularios operacionais da aplicacao.

### `src/components/forms/VehicleEntryDialog.tsx`

Formulario de nova entrada de veiculo.

Controla:

- placa comum e Mercosul;
- selecao de vaga;
- dados do cliente;
- observacoes;
- tipo de contrato;
- vistoria de entrada;
- integracao com pagamento antecipado.

### `src/components/forms/PrepaidChargeDialog.tsx`

Dialog auxiliar de pagamento antecipado antes de concluir a entrada do veiculo.

### `src/components/forms/VehicleExitDialog.tsx`

Formulario de saida do veiculo.

Controla:

- veiculo selecionado;
- convenio;
- calculo de valor por tempo;
- forma de pagamento;
- registro da transacao.

### `src/components/forms/VehicleDetailsDialog.tsx`

Janela detalhada do veiculo.

Mostra e/ou permite:

- dados operacionais;
- historico de vaga;
- transacoes;
- condutor associado;
- troca de vaga.

### `src/components/forms/VehicleInspectionDialog.tsx`

Exibe o checklist de vistoria salvo na entrada.

### `src/components/forms/AttendantCreateDialog.tsx`

Formulario de cadastro de novo manobrista.

Controla:

- nome;
- telefone;
- estacionamento/unidade;
- horario de inicio/fim;
- limite de jornada.

### `src/components/forms/AttendantDetailsDialog.tsx`

Exibe detalhes operacionais e de jornada do manobrista.

### `src/components/forms/AssignTaskDialog.tsx`

Associa um veiculo a um manobrista.

Hoje existe no codigo, mas nao esta claramente plugado em uma experiencia principal de uso nas paginas.

### `src/components/forms/ClientCreateDialog.tsx`

Formulario de cadastro de cliente/fidelidade.

## 8.9 Pasta `src/components/ui/`

Aqui ficam os componentes base de interface gerados/adaptados do ecossistema `shadcn/ui` + Radix.

Esses arquivos nao representam regras de negocio do valet.
Eles representam pecas genericas de UI, por exemplo:

- `button.tsx`, `input.tsx`, `label.tsx`, `textarea.tsx`
- `dialog.tsx`, `alert-dialog.tsx`, `sheet.tsx`, `drawer.tsx`
- `select.tsx`, `checkbox.tsx`, `switch.tsx`, `radio-group.tsx`, `slider.tsx`
- `table.tsx`, `tabs.tsx`, `tooltip.tsx`, `toast.tsx`, `toaster.tsx`
- `card.tsx`, `badge.tsx`, `avatar.tsx`, `calendar.tsx`
- `sidebar.tsx`, `breadcrumb.tsx`, `pagination.tsx`, `navigation-menu.tsx`

Regra pratica:

- se voce quer mudar comportamento/visual generico de botoes, inputs, dialogs e afins, mexa aqui;
- se voce quer mudar regra de negocio da aplicacao, normalmente nao e aqui.

## 8.10 Pasta `src/contexts/`

### `src/contexts/AuthContext.tsx`

Contexto global de autenticacao/sessao simulada.

Hoje ele:

- guarda o papel do usuario em estado local;
- cria o usuario atual;
- expõe funcao `can(...)` baseada em permissao;
- permite trocar manualmente o papel na sidebar.

Hoje nao existe login real, token, sessao remota ou integracao com backend.

## 8.11 Pasta `src/auth/`

### `src/auth/permissions.ts`

Matriz de permissoes por papel.

Se quiser criar Supervisor, restringir Caixa ou separar acoes do Manobrista, e aqui que a regra comeca.

## 8.12 Pasta `src/hooks/`

### `src/hooks/useValetData.ts`

Camada principal de consumo de dados da aplicacao.

Contem:

- queries de leitura;
- mutations de escrita;
- invalidacao de cache do React Query.

Se voce trocar a origem de dados mockados por API real, este arquivo sera um ponto importante de adaptacao.

### `src/hooks/use-toast.ts`

Hook de toast usado pelas telas.

### `src/hooks/use-mobile.tsx`

Hook utilitario relacionado a comportamento responsivo/mobile.

## 8.13 Pasta `src/services/`

### `src/services/valetApi.ts`

Camada fake de API.

Este e um dos arquivos mais importantes do projeto hoje.

Ele centraliza a "regra de negocio simulada", como:

- buscar veiculos;
- buscar manobristas;
- buscar vagas;
- buscar transacoes;
- criar entrada;
- solicitar veiculo;
- registrar saida;
- trocar vaga;
- criar cliente;
- criar manobrista;
- limpar bases mockadas;
- gerar atividades no feed.

Se amanha entrar backend real, este arquivo deve ser substituido ou refeito para chamar endpoints HTTP.

## 8.14 Pasta `src/data/`

### `src/data/mockDb.ts`

Banco de dados fake em memoria.

Aqui moram os arrays principais:

- `vehiclesDb`
- `attendantsDb`
- `parkingSpotsDb`
- `transactionsDb`
- `clientsDb`
- `activitiesDb`
- `revenueDataDb`
- `occupancyDataDb`

Toda a aplicacao de demo depende deste arquivo.

### `src/data/mockData.ts`

Arquivo de apoio/mock adicional. Pode ser usado para seeds, exemplos ou evolucoes futuras, mas hoje o centro real da demo esta em `mockDb.ts`.

## 8.15 Pasta `src/config/`

### `src/config/pricing.ts`

Regras e constantes de precificacao.

Aqui ficam:

- nome da empresa;
- nome padrao da unidade;
- valor da diaria;
- convenios;
- calculo de valor por duracao.

Se voce quiser mudar valores, convênios ou regra de cobranca, mexa aqui.

### `src/config/parkings.ts`

Lista de patios/unidades disponiveis.

Hoje existe apenas uma unidade mockada.

Este arquivo sera fundamental quando o sistema evoluir para Supervisor multi-contrato/multi-patio.

## 8.16 Pasta `src/types/`

### `src/types/valet.ts`

Tipos principais do dominio:

- Vehicle
- Attendant
- ParkingSpot
- Transaction
- DashboardStats
- Client
- Activity

### `src/types/auth.ts`

Tipos de autenticacao, permissao e papel do usuario.

## 8.17 Pasta `src/lib/`

Funcoes utilitarias de negocio e apresentacao.

### `src/lib/format.ts`

Formatacao de:

- moeda BRL;
- horario;
- data/hora;
- duracao.

### `src/lib/selectors.ts`

Filtros de colecoes, principalmente de:

- veiculos;
- manobristas.

### `src/lib/attendantMetrics.ts`

Regras de jornada e indicadores do manobrista:

- minutos trabalhados;
- limite de jornada;
- nivel de carga;
- rotulos de status;
- rotulo de performance.

### `src/lib/utils.ts`

Helpers genericos.

Normalmente contem utilitarios pequenos como combinacao de classes (`cn`).

## 8.18 Pasta `src/test/`

Testes automatizados do projeto.

### `src/test/setup.ts`

Preparacao global do ambiente de testes.

### `src/test/example.test.ts`

Teste exemplo/base.

### `src/test/format.test.ts`

Valida formatadores.

### `src/test/selectors.test.ts`

Valida os filtros de dados.

### `src/test/permissions.test.ts`

Valida permissoes por papel.

### `src/test/valetApi.test.ts`

Valida comportamentos da API fake.

## 9. Onde mexer dependendo do tipo de alteracao

### Se a mudanca for visual/global

Mexa primeiro em:

- `src/index.css`
- `tailwind.config.ts`
- `src/components/ui/*`

### Se a mudanca for em rotas ou acesso

Mexa primeiro em:

- `src/App.tsx`
- `src/components/auth/ProtectedRoute.tsx`
- `src/auth/permissions.ts`
- `src/types/auth.ts`
- `src/contexts/AuthContext.tsx`

### Se a mudanca for na tela do Dashboard

Mexa primeiro em:

- `src/pages/Dashboard.tsx`
- `src/components/dashboard/*`

### Se a mudanca for na aba Veiculos

Mexa primeiro em:

- `src/pages/VehiclesPage.tsx`
- `src/components/dashboard/VehicleStatusCard.tsx`
- `src/components/forms/VehicleEntryDialog.tsx`
- `src/components/forms/VehicleExitDialog.tsx`
- `src/components/forms/VehicleDetailsDialog.tsx`
- `src/components/forms/VehicleInspectionDialog.tsx`

### Se a mudanca for na aba Manobristas

Mexa primeiro em:

- `src/pages/AttendantsPage.tsx`
- `src/components/dashboard/AttendantCard.tsx`
- `src/components/forms/AttendantCreateDialog.tsx`
- `src/components/forms/AttendantDetailsDialog.tsx`
- `src/lib/attendantMetrics.ts`

### Se a mudanca for no mapa do patio

Mexa primeiro em:

- `src/pages/ParkingMapPage.tsx`
- `src/components/dashboard/ParkingMap.tsx`
- `src/data/mockDb.ts`

### Se a mudanca for em cobranca/financeiro

Mexa primeiro em:

- `src/pages/FinancialPage.tsx`
- `src/config/pricing.ts`
- `src/services/valetApi.ts`
- `src/data/mockDb.ts`

### Se a mudanca for em dados/regra de negocio

Mexa primeiro em:

- `src/services/valetApi.ts`
- `src/hooks/useValetData.ts`
- `src/data/mockDb.ts`
- `src/types/valet.ts`

## 10. Limites e observacoes importantes do estado atual

Hoje o sistema tem algumas limitacoes estruturais:

- sem backend real;
- sem persistencia real;
- sem login real;
- sem papel de Supervisor explicito;
- sem filtro real por multiplas unidades/contratos;
- algumas telas do menu ainda estao apenas como "coming soon";
- parte dos textos tem problema de encoding/acentuacao;
- o arquivo `src/App.css` aparenta ser legado;
- `README.md` ainda esta generico;
- `src/services/valetApi.ts` usa arrays em memoria como fonte unica de dados.

## 11. Recomendacoes tecnicas de proximo passo

As proximas evolucoes mais coerentes para este projeto sao:

1. Criar papel real de `supervisor`.
2. Criar estrutura de unidades/patios/contratos.
3. Filtrar dashboard e listas por unidade.
4. Persistir dados em backend real.
5. Substituir `mockDb.ts` por chamadas HTTP.
6. Criar login/autenticacao real.
7. Resolver problemas de encoding nos textos.
8. Revisar itens "coming soon" do menu para esconder ou implementar.

## 12. Resumo rapido

Se voce esta chegando agora no projeto, a ordem mais util para entender a aplicacao e:

1. `package.json`
2. `src/main.tsx`
3. `src/App.tsx`
4. `src/pages/*`
5. `src/components/layout/*`
6. `src/hooks/useValetData.ts`
7. `src/services/valetApi.ts`
8. `src/data/mockDb.ts`
9. `src/config/*`
10. `src/types/*`

Com essa sequencia voce entende:

- como sobe;
- como navega;
- como a tela renderiza;
- de onde os dados vem;
- onde a regra esta;
- onde mexer em cada funcionalidade.
