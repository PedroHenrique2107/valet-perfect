# ValetTracker

Painel operacional de valet parking construido com React, TypeScript, Vite, Tailwind e `shadcn/ui`.

O projeto atual representa uma base frontend para operacao e supervisao de patios de valet, com foco em:

- dashboard operacional;
- gestao de veiculos;
- gestao de manobristas;
- mapa do patio;
- visao financeira;
- simulacao de papeis de acesso.

## Objetivo do sistema

O ValetTracker foi pensado para centralizar a operacao do valet em uma interface unica, permitindo acompanhar:

- entrada e saida de veiculos;
- ocupacao de vagas;
- produtividade e jornada dos manobristas;
- movimentacao financeira;
- indicadores operacionais do dia.

No estado atual, o perfil que melhor representa a visao global e o `admin`. Em termos de negocio, ele funciona como o papel mais proximo de um Supervisor Geral, embora o papel `supervisor` ainda nao exista tecnicamente no codigo.

## Stack principal

- React 18
- TypeScript
- Vite
- React Router DOM
- TanStack React Query
- Tailwind CSS
- `shadcn/ui` + Radix UI
- Vitest
- ESLint

## Requisitos

- Node.js 18+ (recomendado Node 20+)
- npm 9+ ou 10+
- Git

## Como rodar localmente

Instale as dependencias:

```bash
npm install
```

Suba o ambiente de desenvolvimento:

```bash
npm run dev
```

Outros comandos uteis:

```bash
npm run build
npm run preview
npm run test
npm run test:watch
npm run lint
```

## Arquitetura resumida

O fluxo tecnico principal da aplicacao e:

1. `index.html` entrega o HTML base com o `#root`.
2. `src/main.tsx` monta o React.
3. `src/App.tsx` configura providers, rotas e protecao por papel.
4. `src/pages/*` monta cada tela principal.
5. `src/hooks/useValetData.ts` organiza queries e mutations.
6. `src/services/valetApi.ts` simula a API.
7. `src/data/mockDb.ts` guarda os dados em memoria.

## Estrutura principal

### Raiz

- `package.json`: scripts, dependencias e metadados.
- `vite.config.ts`: configuracao de dev server, alias e build.
- `vitest.config.ts`: configuracao de testes.
- `tailwind.config.ts`: tema e extensoes do Tailwind.
- `index.html`: HTML base da aplicacao.
- `GUIA_TECNICO_VALETTRACKER.md`: documentacao tecnica detalhada por pasta/arquivo.

### `src/pages/`

- `Dashboard.tsx`: visao geral do dia com KPIs, mapa, graficos e feed.
- `VehiclesPage.tsx`: operacao de veiculos.
- `AttendantsPage.tsx`: operacao da equipe de manobristas.
- `ParkingMapPage.tsx`: mapa do patio.
- `FinancialPage.tsx`: resumo financeiro e transacoes.

### `src/components/`

- `layout/`: estrutura da interface, principalmente `MainLayout` e `Sidebar`.
- `dashboard/`: cards, graficos, mapa e componentes de resumo.
- `forms/`: dialogs operacionais como entrada, saida, vistoria, clientes e manobristas.
- `auth/`: protecao de rotas.
- `ui/`: componentes base reutilizaveis do design system.

### `src/services/`

- `valetApi.ts`: simula a camada de negocio e alteracao de dados.

### `src/data/`

- `mockDb.ts`: base fake em memoria.

### `src/config/`

- `pricing.ts`: tabela de cobranca, diaria e convenios.
- `parkings.ts`: unidades/patios disponiveis.

### `src/types/`

- `valet.ts`: tipos do dominio.
- `auth.ts`: tipos de papel e permissao.

## Estado atual da aplicacao

Hoje este repositorio e um frontend com dados mockados.

Isso significa:

- nao existe backend real neste projeto;
- nao existe persistencia real;
- as alteracoes se perdem ao recarregar a pagina;
- autenticacao e sessao sao simuladas localmente;
- o sistema ainda nao esta preparado de forma completa para multiunidade real.

## Perfis atuais

Os perfis hoje implementados sao:

- `admin`
- `attendant`
- `cashier`

As permissoes ficam principalmente em:

- `src/auth/permissions.ts`
- `src/types/auth.ts`
- `src/contexts/AuthContext.tsx`

## Direcao de produto recomendada

Considerando que o primeiro perfil de acesso real sera o Supervisor responsavel pelos contratos da empresa, a evolucao mais importante neste momento e sair da visao apenas operacional local e caminhar para uma visao consolidada.

### Recomendacao principal para Supervisor

Vale muito a pena incluir um consolidado multiunidade no topo das abas, com:

- seletor de contrato;
- seletor de patio/unidade;
- cards de excecao operacional;
- destaque rapido do que esta fora do esperado.

O motivo e simples:

- esse perfil nao quer ver somente o detalhe do dia;
- ele precisa descobrir rapidamente onde esta o problema;
- ele precisa comparar unidades, identificar gargalos e agir antes da operacao degradar.

### Aplicacao pratica nas abas

#### Veiculos

Itens prioritarios para Supervisor:

- filtro por unidade/patio;
- SLA de retirada;
- fila de solicitacoes atrasadas;
- placas com maior recorrencia;
- alertas VIP, mensalista e convenio;
- tempo parado acima do limite.

#### Manobristas

Itens prioritarios para Supervisor:

- produtividade por patio;
- jornada atual vs limite;
- tempo medio de entrega;
- fila por manobrista;
- alertas de excesso, ociosidade e gargalo;
- comparativo entre turnos e entre unidades.

## Observacoes tecnicas importantes

- `src/App.css` parece legado do template inicial e tem pouco peso na interface atual.
- `src/index.css` concentra a maior parte da identidade visual global.
- parte dos textos esta com problema de encoding/acentuacao.
- `vite.config.ts` possui `hmr.host` fixo em `192.168.1.59`, o que pode exigir ajuste em outros ambientes.

## Proximo documento para consulta

Para leitura tecnica mais profunda da estrutura por pasta e arquivo, consulte:

- [GUIA_TECNICO_VALETTRACKER.md](./GUIA_TECNICO_VALETTRACKER.md)
