# Reconstrução — Fase 2B: criação de torneio organizada

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O admin cria um torneio em 3 passos. O torneio nasce como rascunho e ganha uma página própria no painel, com:
- barra de etapas e um único botão de próxima ação;
- checklist de publicação;
- fechamento automático das inscrições;
- botão "Duplicar".

**Architecture:**
- A regra de etapas e checklist é uma função pura, `buildTournamentOverview`, testada.
- Novo serviço `adminTournament.service.js` com:
  - **criar rascunho em uma chamada:** valida tudo antes e desfaz se algo falhar;
  - **visão geral;**
  - **duplicar;**
  - **fechar inscrições vencidas.**
- Job a cada 5 minutos, no mesmo estilo da conciliação de pagamentos.
- No frontend:
  - o assistente atual é reagrupado em 3 passos, reaproveitando os campos;
  - nova página `/admin/torneios/:id`.

**Tech Stack:** Express 5, MySQL, React 19, `node --test`.

**Spec:** `docs/superpowers/specs/2026-10-16-reconstrucao-design.md` (seção "Criação de torneio" e as decisões após a revisão, itens 1 a 5 e 8)

## Global Constraints

- **Etapas (equipes):** Rascunho (`criado`) → Inscrições abertas (`aberto`) → Inscrições encerradas (`fechado`) → Chave gerada (`fechado` com ≥1 partida) → Em andamento (`em_andamento`) → Finalizado (`finalizado`). Cancelado fica fora da linha.
- **Ações por etapa:**
  - "Publicar e abrir inscrições" (`criado` → `aberto`), bloqueada se o checklist obrigatório falhar;
  - "Encerrar inscrições" (`aberto` → `fechado`);
  - "Gerar chave" (`POST /admin/competition/tournaments/:id/structure`);
  - "Iniciar torneio" (`fechado` → `em_andamento`);
  - em andamento: nenhuma ação, porque finalizar é automático (aviso "A final encerra o torneio sozinha").
- **Variantes:**
  - **Mix:** Rascunho → Inscrições abertas → Sorteio → Em andamento → Finalizado, com a ação "Sortear equipes" (`POST /mix/admin/:id/draw`). Mix não tem fechamento automático.
  - **Formato `custom`:** "Gerar chave" vira "Criar partidas", com link para `/admin?module=operations`.
- **Checklist obrigatório:**
  - Informações (nome, jogo, datas válidas);
  - Inscrições (vagas > 0 e titulares > 0);
  - Mapas e veto (≥1 mapa no map pool; com veto ligado, mapas ≥ número da série).

  **Opcionais:** premiação e banner.
- **Fechamento automático:** só `aberto`, não Mix, com `registration_closes_at <= NOW()`. Passa para `fechado` e notifica os admins com o número de inscrições pendentes. Nada mais é alterado.
- **Duplicar:** cria um novo `criado` com nome "<nome> (cópia)", sem datas de início e fim e sem inscrições. Copia as configurações de competição, o map pool, o veto, a premiação e o banner. As datas ficam vazias e o checklist cobra.
  - Se o banco exigir `inicio`/`fim` NOT NULL, usar a data atual + 7 dias e marcar o item "Informações" como pendente até o admin revisar. Confirmar no schema.

## Review Focus

1. **Criar rascunho com map pool inválido** (mapa de outro jogo) não deixa torneio pela metade. Teste da compensação (Task 2).
2. **Clique duplo em "Publicar":** a segunda transição falha com a mensagem do backend, sem estado quebrado na tela. Botão em `loading` (Task 5).
3. **Torneio sem `registration_closes_at`** nunca é fechado pelo job. Teste (Task 3).
4. **Torneio antigo,** criado antes desta fase e sem configurações de competição, abre a página sem erro e o checklist mostra o que falta. Teste do overview (Task 1).
5. **Etapa de um Mix já sorteado** (`em_andamento`) não oferece "Sortear" de novo. Teste (Task 1).

---

### Task 1: `buildTournamentOverview` (pura)

**Files:** `backend/src/services/tournamentOverview.js`, `backend/test/tournamentOverview.test.js`

**Interfaces:**
- `buildTournamentOverview({ tournament:{ id, nome, status, inicio, fim, max_teams, titulares, premiacao, banner }, settings:{ format, best_of, pick_ban_enabled, registration_closes_at } | null, mapCount:number, entries:{ total, confirmed, pending_payment }, matchCount:number })`
- Retorno: `{ kind:"equipes"|"mix"|"custom", stage:string, stages:Array<{ key, label, state:"feito"|"atual"|"pendente" }>, checklist:Array<{ key, label, required:boolean, done:boolean, hint:string }>, ready:boolean, nextAction:{ key:"publish"|"close"|"structure"|"start"|"draw"|"manual", label, status?:string, href?:string } | null, note:string|null }`

- [ ] **Testes:**
  - rascunho completo: `ready=true` e a ação é publish;
  - rascunho sem mapas: `ready=false`, a ação é publish e o checklist mostra o item de mapas pendente;
  - `aberto` → close;
  - `fechado` sem partidas → structure;
  - `fechado` com partidas → start, com a etapa "Chave gerada" como atual;
  - `em_andamento` → sem ação e com aviso;
  - Mix aberto → draw;
  - Mix `em_andamento` → sem ação;
  - custom fechado → manual com href;
  - `settings` null → `kind` equipes e o checklist acusa formato e mapas;
  - `cancelado` → sem ação e com o aviso "Torneio cancelado".
- [ ] Implementar e commitar.

### Task 2: Backend do painel do torneio

**Files:**
- Create: `backend/src/services/adminTournament.service.js`, `backend/src/controllers/adminTournament.controller.js`
- Modify:
  - `routes/admin.routes.js`:
    - `POST /admin/tournaments`;
    - `GET /admin/tournaments/:id/overview`;
    - `POST /admin/tournaments/:id/duplicate`.
  - `models/tournament.model.js`: `deleteDraftTournament(id)`, que apaga o map pool, as configurações, o Mix e o próprio torneio só se `status='criado'`.
  - `database/ensureCompetitionTables.js`: `ensureColumn("tournament_competition_settings","registration_closes_at","DATETIME NULL")`.
  - `services/competitionSetup.service.js`: `saveTournamentCompetition` aceita e grava `registration_closes_at`, validando que fica antes do início.

**Interfaces:**
- `createTournamentDraft(adminUser, payload)`. O payload tem os campos do assistente (`tournament`, `competition` e `mix?`). A função chama `registerTournament`, `saveTournamentCompetition` e, se for o caso, `configureMixTournament`. Se algo falhar depois de criar, chama `deleteDraftTournament` e relança o erro. Devolve `{ id }`.
- `getTournamentOverview(id)`: lê do banco e chama `buildTournamentOverview`.
- `duplicateTournament(adminUser, id)`: devolve `{ id }`.

- [ ] Teste de `createTournamentDraft` com dependências injetadas: a falha em competition chama a remoção do rascunho.
- [ ] Implementar e commitar.

### Task 3: Fechamento automático

**Files:**
- Create: `backend/src/services/registrationCloser.service.js`, com `closeExpiredRegistrations({ findDue, close, notify })` (dependências injetadas, testável) e `startRegistrationCloser()` a cada 5 minutos, também ao iniciar.
- Modify: `backend/src/app.js` (inicia junto da conciliação de pagamentos).
- Test: `backend/test/registrationCloser.test.js`:
  - fecha só o que a consulta devolve;
  - erro em um torneio não impede os outros;
  - a notificação recebe o número de pendentes.

- [ ] Teste, implementar e commitar.

### Task 4: "Novo torneio" em 3 passos

**Files:**
- Modify: `frontend/src/pages/TournamentWizardPage.tsx`. Passos:
  - **Básico:** componentes General + Dates + Formato, com o novo campo "Inscrições até".
  - **Inscrições:** Inscrições + Premiação.
  - **Partidas:** Map Pool + Regras. As regras ficam num bloco "Regras avançadas" fechado por padrão.

  O botão final vira "Criar rascunho" e chama `createAdminTournamentDraft` (POST único). Ao criar, navega para `/admin/torneios/:id`.
- Modify: `frontend/src/services/api.ts`:
  - `createAdminTournamentDraft`;
  - `getAdminTournamentOverview`;
  - `duplicateAdminTournament`.

- [ ] Rodar `tsc` e commitar.

### Task 5: Página do torneio no painel

**Files:**
- Create: `frontend/src/pages/AdminTournamentPage.tsx` e a rota `/admin/torneios/:id` (`RequireRole admin`).
  - Topo: nome e `TournamentStatusBadge`.
  - Barra de etapas.
  - Botão da próxima ação (com `loading`, que atualiza a visão geral ao terminar).
  - Checklist.
  - `TournamentStreamField`.
  - Ações secundárias: "Duplicar", "Ver página pública" e "Cancelar torneio" (com confirmação).
  - Atalhos: "Inscrições e pagamentos" → `/admin?module=competitions&torneio=:id`, e "Partidas" → `/admin?module=operations`.
- Modify: `AdminDashboardPage.tsx`:
  - a torre de controle ganha o link "Abrir página do torneio";
  - `?torneio=` pré-seleciona o torneio.
- Modify: `AppLayout` (trilha "Torneio") e `TournamentsPage`. No site público, admins veem "Criar torneio" → `/admin/torneios/novo`, como já acontece.

- [ ] Rodar `tsc`, conferir na prévia e commitar.

### Task 6: Verificação e publicação

- [ ] Rodar `npm test` (backend e frontend), `tsc` e `build`.
- [ ] Prévia: assistente em 3 passos (só navegação; sem backend local não há como criar). Conferir a página do torneio com o overview simulado.
- [ ] PR e merge.
- [ ] No ar: com a sessão de admin do dono, abrir a página do torneio existente, só leitura. Criar torneio de teste somente se o dono pedir.
