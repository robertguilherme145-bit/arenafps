# Redesign Transmissão — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aplicar a identidade "Transmissão" ao site inteiro e refazer home, página do campeonato e
bloco de próxima partida do jogador.

**Architecture:** Os tokens CSS e o `tailwind.config.ts` mudam primeiro, para o site todo herdar a
nova cara. A lógica pura (escolha da partida em destaque, montagem do chaveamento, feed e contagem)
fica em módulos sem dependências, testados com `node --test`. Os componentes React só desenham.
O backend ganha `featured_match` no portal.

**Tech Stack:** React 19, Tailwind 3, Vite 7, Express 5, MySQL, `node --test` (Node 24 roda `.ts`
direto com remoção de tipos, então não é preciso instalar framework de teste).

**Spec:** `docs/superpowers/specs/2026-10-16-redesign-transmissao-design.md`

## Global Constraints

- Cores: bg `#151C26`, panel `#1E2733`, panel-2 `#121922`, line `#2C3847`, text `#E9EEF4`, muted `#8A97A8`, azul `#3D8BFF`, âmbar `#FFB020`, abate `#FF4D5E`, sucesso `#3CCF8E`; texto sobre azul e âmbar `#08111F`.
- Fontes: Chakra Petch 500/600/700 (`font-display`), Barlow 400–700 (`font-sans`). Inter e Poppins saem.
- `--radius: 2px`. O chanfro só aparece no botão primário/urgent, no placar do hero e no card de campeonato em destaque.
- Sem dados inventados. Sem dado, o bloco some ou vira convite. Durante o carregamento, `Skeleton`, nunca "0".
- `prefers-reduced-motion` desliga animações. Foco visível. Sem rolagem horizontal em 375px.
- Todo texto novo com acentos corretos; premiação sempre com "R$".
- Partidas: ao vivo = `'andamento'`, agendada = `'agendada'` (`scheduled_at` pode ser NULL). `official_matches` não entra.

## Review Focus

1. Partida ao vivo sem placar (`score_team_a` NULL ou 0) deve mostrar "0 : 0", não quebrar. Teste em `pickFeaturedMatch` (Task 2).
2. Chaveamento de eliminação simples com número de equipes que não é potência de 2 (ex.: 6) deve arredondar as vagas futuras para cima e não gerar colunas vazias ou negativas. Teste em `buildBracketColumns` (Task 4).
3. Contagem regressiva para data já passada deve mostrar "Agora", nunca valores negativos. Teste em `formatCountdown` (Task 3).
4. Nomes de equipe longos (`Looney Tunes^^ Academy Gaming`) no placar em 375px devem truncar, não estourar a largura. Verificação visual (Task 7).
5. Portal sem nenhum torneio, partida ou ranking (banco novo): a home mostra hero, "Como funciona" e o card final, sem blocos vazios. Verificação visual com resposta vazia (Task 7).

---

### Task 1: Tokens, fontes, componentes base e logo

**Files:**
- Modify: `frontend/src/styles/globals.css` (tokens `:root`, fontes, foco, `.chamfer`, `.live-dot`, reduced motion; remover regras `:root.light` mortas)
- Modify: `frontend/tailwind.config.ts` (fontes; `arena.blue` `#3D8BFF`, `arena.cyan` `#3D8BFF`, `arena.amber` `#FFB020`, `arena.danger` `#FF4D5E`, `arena.success` `#3CCF8E`; escala `cyan` remapeada para tons do azul; `borderRadius.arena: "2px"`; remover `shadow-glow`)
- Modify: `frontend/src/components/ui/Button.tsx` (variante nova `urgent`; `primary` e `urgent` com classe `chamfer` e texto `#08111F`)
- Modify: `frontend/src/components/ui/Badge.tsx` (retangular; tom novo `live`)
- Modify: `frontend/src/components/ui/Card.tsx` (sem blur nem glow)
- Modify: `frontend/src/components/ui/Skeleton.tsx`
- Create: `frontend/src/components/brand/ArenaMark.tsx`; Modify: `frontend/src/components/layout/Logo.tsx`
- Create: `frontend/public/favicon.svg`; Modify: `frontend/index.html` (favicon, `theme-color` `#151C26`)
- Modify: hardcoded `bg-[#…]` (20 usos) → tokens

**Interfaces:**
- Produces: `Button` com `variant?: "primary" | "urgent" | "secondary" | "ghost" | "danger"`; `Badge` com `tone?: "neutral" | "success" | "warning" | "danger" | "info" | "live"`; classes CSS `chamfer` e `live-dot`; `ArenaMark({ size?: number, className?: string })`.

- [ ] **Step 1:** Trocar tokens, fontes e config do Tailwind. A escala `cyan` 50–900 vai de `#EAF2FF` a `#0B2A57`, com `400 = #3D8BFF`.
- [ ] **Step 2:** Ajustar `Button`, `Badge`, `Card` e `Skeleton`.
- [ ] **Step 3:** Desenhar `ArenaMark`: um SVG 32×32 com anel externo `#E9EEF4`, quatro traços de mira com vão no centro e ponto central `#FFB020`. O `Logo` usa a marca e "Arena Camp" em `font-display`; o subtítulo "Competition Engine" sai.
- [ ] **Step 4:** Rodar `npx tsc --noEmit` em `frontend`. O esperado é sair sem erros.
- [ ] **Step 5:** Commit `Aplica identidade Transmissao: tokens, fontes, componentes base e logo`.

### Task 2: `featured_match` no portal (backend)

**Files:**
- Create: `backend/src/services/featuredMatch.js`
- Modify: `backend/src/models/publicPortal.model.js` (query de candidatas)
- Modify: `backend/src/services/publicPortal.service.js` (`getPortal` devolve `featured_match`)
- Test: `backend/test/featuredMatch.test.js`

**Interfaces:**
- Produces: `pickFeaturedMatch(rows: CandidateRow[], now: Date) => FeaturedMatch | null`.
  - `CandidateRow`: `{ id, tournament_id, tournament_name, tournament_status, status, scheduled_at, score_team_a, score_team_b, best_of, current_map_name, current_map_number, team_a, team_a_tag, team_a_logo, team_b, team_b_tag, team_b_logo, updated_at }`.
  - `FeaturedMatch`: `{ id, tournament_id, tournament_name, status:"ao_vivo"|"agendada", team_a:{name,tag,logo}, team_b:{name,tag,logo}, score_a:number, score_b:number, map_name, map_number, best_of, scheduled_at }`.
- Produces (front, Task 3): o tipo `FeaturedMatch` igual em `frontend/src/types/api.ts`, e `PublicPortalData.featured_match: FeaturedMatch | null`.

- [ ] **Step 1: Escrever os testes que falham**, com nomes e asserções:
  - `prefere a partida ao vivo`: rows com uma `andamento` e uma `agendada` futura → `status === "ao_vivo"` e `id` da ao vivo.
  - `entre ao vivo, escolhe a atualizada por ultimo`.
  - `sem ao vivo, escolhe a agendada futura mais proxima`: duas futuras e uma passada → a mais próxima no futuro.
  - `sem data so vale em torneio em andamento`: agendada com `scheduled_at` null e `tournament_status "em_andamento"` → escolhida, com `scheduled_at === null`; com `tournament_status "aberto"` → `null`.
  - `placar nulo vira zero`: ao vivo com `score_team_a` null → `score_a === 0`.
  - `lista vazia devolve null`.
- [ ] **Step 2:** Rodar `node --test test/featuredMatch.test.js` em `backend`. O esperado é falhar com módulo não encontrado.
- [ ] **Step 3:** Implementar `pickFeaturedMatch`. A ordem é: ao vivo (pelo `updated_at` mais recente) → agendada futura (pelo `scheduled_at` mais próximo, com `> now`) → agendada sem data em torneio `em_andamento` (menor `id`) → `null`.
- [ ] **Step 4:** Adicionar a query ao `Promise.all` de `findPortalSnapshot`: partidas `status IN ('andamento','agendada')` com o mesmo filtro de jogo dos resultados, join em teams A/B e tournaments, o mapa atual pela mesma subquery usada em `findPublicTournamentCenter` (mais o `map_number`) e `best_of` de `tournament_competition_settings`, com `LIMIT 30`. Em `getPortal`, devolver `featured_match: pickFeaturedMatch(rows, new Date())`. Antes, confirmar no schema que `matches.updated_at` existe; se não existir, usar `id`.
- [ ] **Step 5:** Rodar `npm test` em `backend`. O esperado é passar tudo.
- [ ] **Step 6:** Commit `Portal informa a partida em destaque para o placar da home`.

### Task 3: Lógica pura e componentes de transmissão

**Files:**
- Create: `frontend/src/lib/countdown.ts`, `frontend/src/lib/activityFeed.ts`
- Create: `frontend/src/components/broadcast/Scoreboard.tsx`, `CountdownTimer.tsx`, `ActivityFeed.tsx`
- Modify: `frontend/src/types/api.ts`
- Test: `frontend/tests/countdown.test.ts`, `frontend/tests/activityFeed.test.ts`
- Modify: `frontend/package.json` (script `"test": "node --test tests/"`)

**Interfaces:**
- Consumes: `FeaturedMatch` (Task 2).
- Produces:
  - `formatCountdown(target: Date, now: Date) => string`: `"2d 04h"` se faltar ≥ 1 dia, `"01:42:10"` se faltar menos, e `"Agora"` se ≤ 0.
  - `buildActivityFeed(portal: Pick<PublicPortalData,"results"|"tournaments"|"champions">, limit = 6) => FeedItem[]`, com `FeedItem = { key:string; kind:"result"|"open"|"champion"; text:string; highlight:string; href:string }`.
  - `<Scoreboard match={FeaturedMatch} />`, `<CountdownTimer target={string} />` e `<ActivityFeed items={FeedItem[]} />`.
- Os módulos em `lib/` não importam nada (para rodar no `node --test`). Os tipos que precisam são declarados localmente e mantidos estruturalmente iguais aos de `types/api.ts`.

- [ ] **Step 1: Testes que falham:**
  - `formatCountdown`: 1h42m10s → `"01:42:10"`; 2 dias e 4 horas → `"2d 04h"`; passado → `"Agora"`.
  - `buildActivityFeed`:
    - um resultado vira `{kind:"result", highlight:<vencedor>, text:"venceu <perdedor> por 13–8", href:"/torneios/<id>"}`;
    - um torneio `aberto` vira `kind:"open"`;
    - campeões viram `kind:"champion"`;
    - a lista é ordenada por data, com no máximo `limit` itens;
    - portal vazio devolve `[]`.
- [ ] **Step 2:** Rodar `node --test tests/` em `frontend`. O esperado é falhar.
- [ ] **Step 3:** Implementar os módulos `lib/` e os componentes. O `Scoreboard` tem três colunas (time A com barra azul, centro, time B com barra âmbar):
  - O centro mostra `Badge tone="live"` "Ao vivo" e o placar se `ao_vivo`.
  - Se `agendada` com data, mostra `CountdownTimer` e a data.
  - Sem data, mostra "Horário a definir".
  - Abaixo: "Mapa N · nome" e o formato (`MD3`).
  - O componente leva a classe `chamfer`, e os nomes usam `truncate`.
  - Em 375px, os times empilham.
- [ ] **Step 4:** Rodar `node --test tests/` e `npx tsc --noEmit`. O esperado é passar.
- [ ] **Step 5:** Commit `Adiciona placar, contagem e feed de atividade`.

### Task 4: Chaveamento visual

**Files:**
- Create: `frontend/src/lib/bracket.ts`, `frontend/src/components/broadcast/BracketView.tsx`
- Test: `frontend/tests/bracket.test.ts`

**Interfaces:**
- Produces:
  - `buildBracketColumns(input: { format: string | null; teamCount: number; matches: BracketMatch[] }) => BracketColumn[]`.
  - `BracketMatch = { id:number; round:number; stage?:string|null; status:string; team_a?:string|null; team_b?:string|null; team_a_id:number; team_b_id:number; winner_team_id:number|null; score_team_a:number|null; score_team_b:number|null; scheduled_at:string|null }`.
  - `BracketColumn = { key:string; title:string; slots:Array<{ match: BracketMatch } | { placeholder:true }> }`.
  - `<BracketView columns={BracketColumn[]} onOpen?={(id:number)=>void} />`.

- [ ] **Step 1: Testes que falham:**
  - `single_elimination` com 8 equipes e só a rodada 1 (4 partidas) → 3 colunas com títulos `"Quartas de final"`, `"Semifinal"`, `"Final"` e slots 4/2/1, sendo os slots das rodadas 2 e 3 todos `placeholder`.
  - Com 6 equipes → total de rodadas `ceil(log2(6)) = 3`. A rodada 1 tem as partidas reais e as rodadas seguintes têm 2 e 1 placeholders.
  - Rodada 2 parcialmente criada (1 de 2 partidas) → 1 match e 1 placeholder.
  - `double_elimination` → só as rodadas existentes, título `"Rodada N"`, sem placeholders.
  - `group_playoffs` com `stage` `"group"` e `"playoff"` → colunas com chave `stage-round`, título `"Grupos · Rodada 1"` e `"Playoffs · Rodada 1"`.
  - `teamCount` 0 e sem partidas → `[]`.
- [ ] **Step 2:** Rodar `node --test tests/bracket.test.ts`. O esperado é falhar.
- [ ] **Step 3:** Implementar. Títulos para eliminação simples, contando de trás: `Final`, `Semifinal`, `Quartas de final`, `Oitavas de final`; antes disso, `Rodada N`. Os slots de cada rodada da eliminação simples são `2^(total-r)`.
- [ ] **Step 4:** Implementar `BracketView`:
  - colunas com `min-w-[240px]` e rolagem horizontal só dentro do bloco;
  - partida com barra lateral azul (time A) ou âmbar (time B) e o vencedor destacado;
  - ao vivo com `Badge tone="live"`;
  - a coluna "Final" com borda âmbar;
  - placeholder com "A definir" e borda tracejada.
- [ ] **Step 5:** Testes e `tsc` passando; commit `Adiciona chaveamento visual`.

### Task 5: Nova home

**Files:**
- Modify: `frontend/src/pages/HomePage.tsx` (reescrita das seções; manter os helpers de formatação, com acentos)
- Delete: `frontend/src/assets/arena-hero.png` (só a home usa)

**Interfaces:**
- Consumes: `Scoreboard`, `ActivityFeed`, `buildActivityFeed`, `Button variant="urgent"`, `Badge tone="live"`, `portal.featured_match`.

- [ ] **Step 1:** Montar as seções na ordem do spec:
  1. Hero:
     - título "Seu time no servidor. Seu nome no placar.";
     - subtítulo "Campeonatos de FPS com inscrição por PIX, veto de mapas, estatísticas por partida e ranking oficial.";
     - botões por papel, conforme o spec;
     - `Scoreboard` ou o card do campeonato aberto mais próximo, ou nada.
  2. Chips de jogo.
  3. `ActivityFeed`, se houver itens.
  4. Campeonatos: o destaque (com chanfro, barra de vagas `entry_count/max_teams`) e a agenda.
  5. Ranking, com a chamada de data quando todos tiverem 0 partidas.
  6. "Como funciona" (6 passos).
  7. Notícias e FAQ, se houver conteúdo.
  8. "Pronto para competir?", só para visitantes.
  9. Rodapé.

  Removidos: a barra fixa inferior, "Plataforma em números", "Equipes em destaque", "Jogadores em destaque" e "Hall da fama".
- [ ] **Step 2:** No carregamento, `Skeleton` no lugar do placar, do destaque e do ranking.
- [ ] **Step 3:** `npx tsc --noEmit` passando; commit `Refaz a home no formato Transmissao`.

### Task 6: Página do campeonato, painel do jogador, layout e textos

**Files:**
- Modify: `frontend/src/pages/TournamentDetailPage.tsx`:
  - topo: Badge de status, nome, linha de dados (prêmio com R$, equipes, formato, início) e ações;
  - abas com barra âmbar;
  - aba de chaveamento com `buildBracketColumns`/`BracketView`, exceto `round_robin`/`league`, que mantêm a tabela;
  - mojibake corrigido.
- Modify: `frontend/src/features/player/PlayerOverviewModules.tsx`: o bloco da próxima partida sobe para o topo, com `CountdownTimer` (ou "Horário a definir"), barra âmbar no topo e as ações existentes. Sem partida: "Sua equipe não tem partidas marcadas." com o link "Ver campeonatos abertos" para `/torneios`.
- Modify: `frontend/src/components/layout/Navbar.tsx`, `Sidebar.tsx` (tokens; item ativo com barra azul de 3px), `TournamentsPage.tsx`, `TournamentRegulationPanel.tsx` (mojibake), `i18n/translations.ts` (acentos).

- [ ] **Step 1:** Fazer as alterações acima.
- [ ] **Step 2:** Rodar `grep -rn "Ã" src` em `frontend`. O esperado é não achar nada fora de `assets`.
- [ ] **Step 3:** Rodar `npx tsc --noEmit` e `node --test tests/`. O esperado é passar.
- [ ] **Step 4:** Commit `Aplica Transmissao ao campeonato, painel do jogador e textos`.

### Task 7: Verificação final

- [ ] **Step 1:** Rodar `npm test` no backend e `npm run build` no frontend. O esperado é passar.
- [ ] **Step 2:** Subir o Vite em dev com `VITE_API_URL` apontando para a API pública de produção. Só se usam GETs públicos de leitura (portal, torneios), nada de login ou escrita.
- [ ] **Step 3:** Conferir home, `/torneios/1`, `/torneios` e `/entrar` em 1280px e 375px:
  - `scrollWidth === innerWidth`;
  - sem erros no console;
  - nomes longos truncando (Review Focus 4);
  - portal vazio simulado (Review Focus 5).
- [ ] **Step 4:** Registrar o que não foi possível verificar (painéis logados, admin) para o resumo final.
