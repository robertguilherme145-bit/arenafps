# Reconstrução — Fase 2A: guia de inscrição e transmissão

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Duas coisas:
- A página pública do torneio ganha um cartão "Sua inscrição", que diz em que passo a pessoa está e mostra o botão certo para o próximo passo.
- A transmissão ao vivo (Twitch, YouTube ou Kick) aparece dentro do site.

**Architecture:** Duas funções puras e testadas fazem o trabalho:
- `toEmbed(url, parent)` transforma o link no player oficial. Existe em `backend/src/utils/streamEmbed.js`, para validar ao salvar, e em `frontend/src/lib/streamEmbed.ts`, para exibir.
- `registrationGuide(input)` decide os passos e a ação do cartão de inscrição.

O banco ganha `tournaments.stream_url` e `matches.stream_url` via `ensureColumn`. A CSP passa a liberar só os players dessas três plataformas.

**Tech Stack:** React 19, Express 5, MySQL, `node --test`.

**Spec:** `docs/superpowers/specs/2026-10-16-reconstrucao-design.md` (seções "Transmissão" e "Página do torneio")

## Global Constraints

- **Plataformas aceitas:**
  - Twitch: `twitch.tv/<canal>` e `twitch.tv/videos/<id>`.
  - YouTube: `watch?v=`, `youtu.be/`, `/live/<id>`, `/embed/<id>` e `/channel/<UC…>/live`.
  - Kick: `kick.com/<canal>`.
  - Qualquer outro link é recusado com a mensagem "Use um link da Twitch, YouTube ou Kick."
- **Players:**
  - Twitch: `https://player.twitch.tv/?channel=X&parent=<host>&muted=true` (ou `?video=ID`).
  - YouTube: `https://www.youtube-nocookie.com/embed/ID`, ou `https://www.youtube-nocookie.com/embed/live_stream?channel=UC…`.
  - Kick: `https://player.kick.com/X`.
- **CSP:** `frame-src https://player.twitch.tv https://www.youtube-nocookie.com https://player.kick.com`.
- **Prioridade:** o link da partida vale mais que o do torneio.
- **Só pt-BR.** Toda URL salva passa por `optionalHttpUrl` antes do `toEmbed`.

## Review Focus

1. Link de canal do YouTube por `@handle` não pode ser embutido. Ele deve ser recusado com uma mensagem que explique como pegar o link da live. Teste em `streamEmbed` (Tasks 1 e 3).
2. Visitante sem login vê "Criar conta para participar" e nunca um erro. Teste em `registrationGuide` (Task 4).
3. Pessoa com time em outro jogo não pode ver "Inscrever equipe" num torneio de jogo diferente. Teste em `registrationGuide`.
4. Torneio Mix sempre leva para a inscrição individual. Teste em `registrationGuide`.
5. Twitch dentro do site exige `parent` igual ao host. Em `localhost` e em `www.`, o player precisa usar o host atual (`window.location.hostname`). Teste em `streamEmbed`.

---

### Task 1: `toEmbed` no backend, colunas, CSP e salvamento

**Files:**
- Create: `backend/src/utils/streamEmbed.js`, `backend/test/streamEmbed.test.js`
- Modify: `backend/src/database/ensureCompetitionTables.js`, com `ensureColumn("tournaments","stream_url","VARCHAR(500) NULL")` e `ensureColumn("matches","stream_url","VARCHAR(500) NULL")`
- Modify: `backend/src/middleware/securityHeaders.js` (`frame-src`) e o teste correspondente
- Modify:
  - `services/competitionSetup.service.js` e `models/competitionSetup.model.js`, para que `saveMatchRoomSettings` grave `stream_url`;
  - novo `saveTournamentStream(adminUser, tournamentId, payload)`;
  - rota `PUT /admin/competition/tournaments/:tournamentId/stream`.

**Interfaces:**
- `toEmbed(url: string, parent: string) => { platform:"twitch"|"youtube"|"kick"; embedUrl:string } | null`
- `normalizeStreamUrl(value) => string | null`. Vazio devolve `null`. Inválido lança `Error("Use um link da Twitch, YouTube ou Kick.")`, e `@handle` do YouTube lança uma mensagem específica.

- [ ] **Testes:**
  - os formatos aceitos de cada plataforma, com o player esperado;
  - `twitch.tv/videos/123`;
  - `youtube.com/@canal` recusado com "Abra a live no YouTube e copie o link do vídeo";
  - `https://exemplo.com` recusado;
  - `javascript:` recusado;
  - CSP com `frame-src`.
- [ ] Implementar, rodar `npm test` e commitar.

### Task 2: Transmissão nos dados públicos

**Files:**
- Modify: `backend/src/models/publicPortal.model.js`, para que as candidatas do placar incluam `m.stream_url` e `t.stream_url AS tournament_stream_url`.
- Modify: `backend/src/services/featuredMatch.js`, para que `stream_url` seja o da partida ou, sem ele, o do torneio. Teste em `featuredMatch.test.js`.
- O centro público do torneio já devolve `t.*` e `m.*`, então já inclui as colunas novas.

- [ ] Teste primeiro, implementar e commitar.

### Task 3: Player no site e campos no painel

**Files:**
- Create: `frontend/src/lib/streamEmbed.ts` (mesmo contrato), `frontend/tests/streamEmbed.test.ts`
- Create: `frontend/src/components/broadcast/StreamPlayer.tsx`, um iframe 16:9 com `title` e `allow="autoplay; fullscreen; picture-in-picture"` e `allowFullScreen`. Ele usa `window.location.hostname` como `parent` e, quando o link é inválido, mostra "Transmissão indisponível".
- Modify:
  - `components/broadcast/Scoreboard.tsx`: botão "Assistir" quando houver `stream_url`; ao clicar, abre o player abaixo do placar.
  - `types/api.ts`: `FeaturedMatch.stream_url`, `Tournament.stream_url` e `Match.stream_url`.
- Modify: `pages/TournamentDetailPage.tsx`. Faixa "Ao vivo" com o player no topo quando houver partida `andamento` com link (dela ou do torneio), ou quando o torneio estiver `em_andamento` com link próprio.
- Modify:
  - `features/admin/CompetitionOperationsWorkspace.tsx`: campo "Link da transmissão" na sala da partida;
  - `services/api.ts`: `stream_url` em `updateMatchRoomSettings` e o novo `updateTournamentStream(id, url)`.
- Modify: `pages/AdminDashboardPage.tsx`, campo "Transmissão do torneio" na torre de controle de Torneios e inscrições.

- [ ] Testes do `streamEmbed` no front, implementar, rodar `tsc` e commitar.

### Task 4: Cartão "Sua inscrição" na página pública do torneio

**Files:**
- Create: `frontend/src/lib/registrationGuide.ts`, `frontend/tests/registrationGuide.test.ts`
- Create: `frontend/src/components/tournament/RegistrationGuide.tsx`
- Modify: `pages/TournamentDetailPage.tsx`. O cartão fica ao lado do conteúdo das abas em telas largas e acima delas no celular. Sai o botão "Inscrever equipe" do topo, que passa a ser o cartão.

**Interfaces:**
- `registrationGuide(input: { loggedIn:boolean; tournament:{ status:string; format:string|null; game_id:number|null }; teams:Array<{ team_id:number; game_id:number; role:"jogador"|"lider"|"capitao" }>; entries:Array<{ team_id:number; status:string; payment_status:string }>; nextMatchId:number|null; paid:boolean }) => { steps:Array<{ label:string; state:"feito"|"pendente"|"bloqueado" }>; action:{ label:string; href:string; tone:"urgent"|"primary"|"secondary" }|null; note:string|null }`

- [ ] **Testes:**
  - **Sem login:** a ação é "Criar conta para participar" → `/criar-conta`.
  - **Torneio `em_andamento` ou `finalizado` sem inscrição:** sem ação e com uma nota.
  - **Mix:** a ação é "Inscrever-se no Mix" → `/jogador?module=mix`.
  - **Sem time no jogo do torneio:** "Criar ou entrar numa equipe" → `/jogador?module=teams`. Isso vale também para quem tem time só em outro jogo.
  - **Líder, ainda sem inscrição:** "Inscrever equipe" → `/lider?module=tournaments`.
  - **Jogador sem cargo de líder:** sem ação e com a nota "Peça ao líder da sua equipe para inscrever".
  - **Inscrição com pagamento pendente:**
    - líder: "Pagar inscrição" → `/lider?module=finance`;
    - outros: a nota "Aguardando o líder pagar".
  - **Inscrição confirmada com partida:** "Ir para a partida" → `/jogador?module=matches`.
  - **Inscrição confirmada sem partida:** a nota "Inscrição confirmada. A chave sai quando as inscrições encerrarem."

  Passos: Conta → Equipe → Inscrição → Pagamento (omitido se gratuito) → Partida.
- [ ] Implementar, rodar `tsc` e `npm test`, e commitar.

### Task 5: Verificação e publicação

- [ ] Rodar `npm test` (backend e frontend), `tsc` e `vite build`.
- [ ] Na prévia com dados simulados: placar com "Assistir" e o player da Twitch (a CSP não bloqueia), a faixa "Ao vivo" na página do torneio, e o cartão de inscrição nos casos visitante, líder e confirmado. Conferir em 1280px e 375px.
- [ ] PR, merge, conferência no ar e conferência de que `ensureColumn` criou as colunas (o painel salva o link sem erro).
