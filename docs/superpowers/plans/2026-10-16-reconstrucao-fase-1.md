# Reconstrução — Fase 1: base e navegação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Novo menu público e rodapé, Torneios com abas e calendário, Comunidade, redirecionamentos, ícone novo, remoção do idioma, do tema e do `/design-system`, termos em português e sem dados velhos (rascunho, cancelado, equipe inativa) no site público.

**Architecture:** Regras puras (status → aba, status → chip, links antigos → novos) ficam em `frontend/src/lib`, testadas com `node --test`. Componentes compartilhados (`SiteHeader`, `SiteFooter`, `PageHeader`, `StatusBadge`) passam a ser usados em todas as páginas públicas. No backend, as consultas públicas do portal ignoram `criado` e `cancelado` e equipes inativas.

**Tech Stack:** React 19, React Router 7, Tailwind 3, Express 5, MySQL, `node --test`.

**Spec:** `docs/superpowers/specs/2026-10-16-reconstrucao-design.md`

## Global Constraints

- Só português (pt-BR com acentos). Nenhum texto visível em inglês.
- Menu público: Torneios · Circuito · Ranking · Comunidade · Notícias. Rodapé: Sobre, Perguntas frequentes, Contato, Privacidade e Termos.
- Chips de status de torneio, com os mesmos textos em todo lugar:
  - `criado` → "Rascunho"
  - `aberto` → "Inscrições abertas" (warning)
  - `fechado` → "Inscrições encerradas" (neutral)
  - `em_andamento` → "Ao vivo" (live)
  - `finalizado` → "Encerrado" (success)
  - `cancelado` → "Cancelado" (danger)
- Abas de Torneios:
  - Abertos = `aberto`
  - Em andamento = `fechado` + `em_andamento`
  - Encerrados = `finalizado`
  - Calendário = todos os públicos

  `criado` e `cancelado` nunca aparecem no site público.
- Links antigos nunca dão 404.
- A segurança atual se mantém (CSP, `safeHref`, limites).

## Review Focus

1. Link antigo com parâmetros (`/calendario?x=1`, `/equipes?q=gameover`) redireciona preservando o que fizer sentido, sem quebrar. Teste em `legacyRedirects` (Task 3).
2. Torneio com status desconhecido (texto novo no banco) não some nem quebra a página: cai em "Encerrados" com o chip neutro usando o próprio texto. Teste em `tournamentStatus` (Task 2).
3. A remoção do idioma não pode quebrar quem tem `arena-language` salvo no navegador. Nada deve ler essa chave depois.
4. Menu no celular (375px): os 5 itens ficam acessíveis num menu que abre, sem rolagem horizontal. Verificação visual (Task 7).
5. Admin, líder, capitão e jogador logados continuam com o menu lateral e a troca de contexto atuais (são substituídos só nas fases 3 e 4). Verificação visual (Task 7).

---

### Task 1: Ícone, limpeza de idioma, tema e design-system

**Files:**
- Modify: `frontend/public/favicon.svg` (opção 2: `rect rx=12 #FFB020`, anel `#151C26` r=17 stroke 6, ponto r=6)
- Modify: `frontend/index.html` (tirar `translate="no"`, `class="notranslate"` e `<meta name="google" content="notranslate">`)
- Delete: `frontend/src/i18n/I18nProvider.tsx`, `frontend/src/i18n/translations.ts`; Modify: `frontend/src/app/App.tsx` (sem provider), `components/layout/Navbar.tsx`, `pages/GamesPage.tsx` (textos fixos em pt-BR)
- Delete: `frontend/src/utils/theme.ts`; Modify: `App.tsx`, `features/player/PlayerCommunicationModules.tsx`, `features/player/PlayerSecurityModule.tsx`, `pages/LeaderDashboardPage.tsx`, `pages/CaptainDashboardPage.tsx` (remover o campo "Tema" e as chamadas; o valor salvo no backend é ignorado)
- Delete: `frontend/src/pages/DesignSystemPage.tsx` e a rota

- [ ] Fazer as mudanças acima. Rodar `grep -rn "useI18n\|setArenaTheme\|DesignSystemPage\|arena-language" src` em `frontend`. O esperado é não achar nada.
- [ ] Rodar `npx tsc --noEmit` e `npm test`. O esperado é passar.
- [ ] Commit `Fase 1: icone novo e remove idioma, tema e design-system`.

### Task 2: Status e abas de torneio (lógica pura + componente)

**Files:**
- Create: `frontend/src/lib/tournamentStatus.ts`, `frontend/tests/tournamentStatus.test.ts`
- Create: `frontend/src/components/ui/StatusBadge.tsx`

**Interfaces:**
- `tournamentStatusLabel(status: string): { label: string; tone: "neutral"|"success"|"warning"|"danger"|"info"|"live" }`
- `isPublicTournament(status: string): boolean`, que é falso para `criado` e `cancelado`.
- `tournamentTab(status: string): "abertos" | "andamento" | "encerrados"`
- `<TournamentStatusBadge status={string} />`

- [ ] **Testes primeiro:**
  - cada status da lista global volta o rótulo e o tom exatos;
  - status desconhecido `"pausado"` → `{ label:"pausado", tone:"neutral" }` e aba `"encerrados"`;
  - `isPublicTournament("criado")` e `isPublicTournament("cancelado")` são falsos e os outros são verdadeiros;
  - `fechado` e `em_andamento` → `"andamento"`.
- [ ] Rodar `npm test`. O esperado é falhar; implementar e rodar de novo até passar.
- [ ] Trocar as funções locais `status()` e `statusTone()` em `HomePage.tsx`, `TournamentDetailPage.tsx` e `TournamentsPage.tsx` pelo módulo novo.
- [ ] Commit `Fase 1: status de torneio padronizados`.

### Task 3: Redirecionamentos de links antigos

**Files:**
- Create: `frontend/src/lib/legacyRedirects.ts`, `frontend/tests/legacyRedirects.test.ts`
- Modify: `frontend/src/routes/router.tsx` (componente `<LegacyRedirect />`, que usa `<Navigate replace>` com o destino calculado)

**Interfaces:**
- `legacyPublicRedirect(pathname: string, search: string): string | null`

- [ ] **Testes primeiro:**
  - `/calendario` → `/torneios?aba=calendario`
  - `/resultados` → `/torneios?aba=encerrados`
  - `/circuito-oficial` → `/circuito`
  - `/equipes?q=go` → `/comunidade?aba=equipes&q=go`
  - `/jogadores` → `/comunidade?aba=jogadores`
  - `/team/abc` → `/equipe/abc`
  - `/player/LYKROK` → `/jogador/LYKROK`
  - `/torneios` → `null`
- [ ] Implementar e registrar as rotas de redirecionamento. `/circuito` passa a renderizar `OfficialTournamentsPage`.
- [ ] Commit `Fase 1: links antigos redirecionam para a estrutura nova`.

### Task 4: Topo e rodapé do site

**Files:**
- Modify: `frontend/src/components/layout/Navbar.tsx`:
  - menu público com os 5 itens;
  - menu de celular com botão "Menu" que abre a lista;
  - remover o chip "Workspace"/"Plataforma" e o seletor de idioma;
  - manter a busca, as notificações, o seletor de contexto atual (até a fase 3) e Entrar, Criar conta e Sair.
- Create: `frontend/src/components/layout/SiteFooter.tsx`, com os links do rodapé e o "© ano Arena Camp".
- Modify: `frontend/src/layouts/AppLayout.tsx`:
  - `SiteFooter` em todas as páginas fora do painel;
  - breadcrumbs com nomes legíveis (`admin` → "Painel", `lider` → "Líder", `capitao` → "Capitão", `jogador` → "Jogador").
- Modify: `frontend/src/pages/HomePage.tsx` (remover o rodapé local).

- [ ] Fazer as mudanças acima, rodar `npx tsc --noEmit` e commitar `Fase 1: menu publico novo e rodape unico`.

### Task 5: Torneios com abas e calendário, Comunidade

**Files:**
- Modify: `frontend/src/pages/TournamentsPage.tsx`:
  - abas Abertos · Em andamento · Encerrados · Calendário, lidas e gravadas em `?aba=`;
  - busca e filtro de jogo mantidos;
  - lista filtrada por `isPublicTournament`;
  - estado vazio por aba com chamada.
- Modify: `frontend/src/pages/CalendarPage.tsx`, que vira o componente `TournamentCalendar` usado na aba. Ele recebe a lista já filtrada e permite navegar entre meses (anterior e próximo).
- Delete: `frontend/src/pages/ResultsPage.tsx` (os resultados ficam na aba Encerrados e na página de cada torneio).
- Modify: `frontend/src/pages/CommunityDirectoryPage.tsx`, que vira a rota `/comunidade` com abas Equipes e Jogadores em `?aba=` e a busca em `?q=`.

- [ ] Fazer as mudanças, rodar `npx tsc --noEmit` e `npm test`, e commitar `Fase 1: torneios com abas e calendario; comunidade unificada`.

### Task 6: Backend sem dados velhos no portal

**Files:**
- Modify: `backend/src/models/publicPortal.model.js`:
  - na consulta de torneios, `t.status NOT IN ('criado','cancelado')`;
  - em jogadores (portal e busca), `t.ativo=1`;
  - na busca de torneios, ignorar `criado` e `cancelado`.
- Modify: `backend/src/models/publicPortal.model.js`, `findPublicTeamProfile`: aceitar slug ou id numérico (`WHERE (t.slug=? OR t.id=?)`).
- Test: `backend/test/publicPortalFilters.test.js`. Ele lê o SQL exportado e afirma que as cláusulas existem; é uma checagem de regressão barata.

- [ ] Teste primeiro, depois implementar, rodar `npm test` em `backend` e commitar `Fase 1: portal publico ignora rascunhos, cancelados e equipes inativas`.

### Task 7: Textos e verificação

- [ ] Trocar os termos visíveis:
  - "Workspace" → "Painel"
  - "Lineup" e "Lineups" → "Escalação" e "Escalações"
  - "Pick &amp; Ban" → "Veto de mapas"
  - "Competition Engine" sai

  Rodar `grep -rhoE '>(Workspace|Lineups?|Pick & Ban|Competition Engine)<|"(Workspace|Lineups?|Pick & Ban)"' src` em `frontend`. O esperado é não achar nada.
- [ ] Rodar `npm test` (backend e frontend), `npx tsc --noEmit` e `vite build`.
- [ ] Na prévia local com CSP: home, `/torneios` (4 abas), `/comunidade` (2 abas), `/circuito`, `/calendario` → redireciona, e menu e rodapé em 1280px e 375px, sem erros e sem rolagem horizontal.
- [ ] Commit, PR, merge e conferência no ar (o dono autorizou publicar fases testadas).
