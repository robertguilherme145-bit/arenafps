# Redesign "Transmissão" — documento de design

Data: 16/10/2026 · Branch: `redesign/transmissao` (criada a partir de `fix/seguranca-riscos-altos`)

## Intenção

O Arena Camp hoje usa o visual genérico de "app gamer": preto, azul e ciano neon, cards iguais e
uma home longa com muitos blocos vazios ou zerados. O dono escolheu a direção **Transmissão**
entre três propostas (`arena-camp-3-designs.html` e `arena-camp-exemplos.html`, fora do repo).
A ideia é que o site pareça a tela de uma transmissão de campeonato de FPS: placar, lado azul
contra lado âmbar e um "killfeed" com o que acontece na plataforma.

O objetivo é que quem chega por um link no WhatsApp ou no Discord entenda em segundos o que está
rolando, qual é o próximo campeonato e como se inscrever. Quem já é jogador deve achar a
próxima partida sem procurar.

## Metas

1. Nova identidade visual aplicada a **todo** o site por meio de tokens e componentes base, sem
   reescrever cada página.
2. Home refeita no formato Transmissão.
3. Página do campeonato com topo novo e chaveamento visual.
4. Painel do jogador abrindo com um bloco "Próxima partida".
5. Textos visíveis em português correto (acentos) nas páginas públicas e nos componentes
   compartilhados.
6. Nenhuma tela mostra "0" ou tabelas de zeros enquanto carrega ou quando não há dados.

## Fora do escopo desta etapa

- Central "Hoje" do admin, painel financeiro e papéis por função. Vão para uma segunda etapa,
  porque precisam de agregações novas no backend. Nesta etapa, os painéis admin, líder e capitão
  recebem só o novo visual via tokens e componentes.
- Quebrar `AdminDashboardPage.tsx` (3.672 linhas) e `LeaderDashboardPage.tsx` (3.991 linhas).
- Pré-renderização (SSR ou prerender) para SEO e prévias de link.
- Check-in de verdade, upload de print e overlay para OBS. A UI pode reservar espaço, mas não
  deve ter botões falsos.
- Tema claro: hoje o tema já é forçado para escuro (`utils/theme.ts`) e continua assim.

## O que não pode acontecer

- Dados inventados na interface de produção. Os mockups usam placares e K/D ilustrativos, mas o
  site real só mostra o que vem da API. Sem dado, mostra um convite à ação ou esconde o bloco.
- Quebrar fluxos existentes: login, cadastro, inscrição, pagamento PIX/PayPal, veto, painéis.
- Regressão de acessibilidade: contraste mínimo AA, foco visível e `prefers-reduced-motion`
  respeitado.
- Rolagem horizontal na página em 375px de largura (hoje a barra fixa do rodapé causa isso).

## Identidade (decidida)

### Cores (tokens em `:root`, consumidos pelo Tailwind via `rgb(var(--x) / <alpha-value>)`)

| Token | Hex | Uso |
|---|---|---|
| `--arena-bg` | `#151C26` | fundo da página ("servidor") |
| `--arena-panel` | `#1E2733` | superfícies |
| `--arena-panel-2` | `#121922` | superfícies rebaixadas (placar, tabelas) |
| `--arena-line` | `#2C3847` | bordas |
| `--arena-text` | `#E9EEF4` | texto |
| `--arena-muted` | `#8A97A8` | texto de apoio |
| lado azul | `#3D8BFF` | ação primária, time A, links |
| lado âmbar | `#FFB020` | urgência, CTA de inscrição, time B, aba ativa |
| abate | `#FF4D5E` | ao vivo, erro |
| sucesso | `#3CCF8E` | pago, confirmado, K/D positivo |

O texto sobre azul e âmbar é escuro (`#08111F`), não branco, para manter contraste.

**Ponte para o código atual:** existem 362 usos de classes `cyan-*`. Em vez de editar todos, o
`tailwind.config.ts` redefine a escala `cyan` com tons do lado azul (50–900), para que o
código antigo herde a nova cor. O mesmo vale para `arena.blue` e `arena.cyan`. Os usos de
`bg-[#…]` fixos (20 ocorrências) são trocados à mão por tokens.

### Tipografia

- **Chakra Petch** (500/600/700): títulos, placares, números. É a classe `font-display`, então
  os 250 usos atuais mudam sozinhos.
- **Barlow** (400–700): todo o texto. Substitui Inter como `font-sans`.
- Poppins sai do projeto.
- Rótulos em caixa alta (`uppercase`, 87 usos) passam para sentence case nas páginas
  redesenhadas. Nas demais, podem ficar nesta etapa.

### Forma

- Cantos retos (`--radius: 2px`). Badges deixam de ser pílulas.
- **Chanfro** (canto cortado com `clip-path`) é reservado ao botão primário, ao placar do hero e
  ao card de campeonato em destaque. É a marca registrada, então não pode ser usado em todo lugar.
- Sem `backdrop-blur` nem `shadow-glow`. A profundidade vem das camadas `panel` e `panel-2`.

### Movimento

- Um único momento animado: o placar do hero entra (fade, 200–300 ms) e o ponto "ao vivo" pulsa.
- Fade-up em cada seção (framer-motion) só nas páginas redesenhadas; nas outras, fica como está.
- Tudo desligado com `prefers-reduced-motion: reduce`.

## Componentes base (em `src/components/ui`)

- `Button`: variantes `primary` (azul, chanfro), `urgent` (âmbar, chanfro, para inscrever ou
  pagar), `secondary` (borda), `ghost` e `danger`. A API atual é mantida, e `urgent` é nova.
- `Badge`: retangular. Os tons existentes continuam e ganha `live` (abate, com ponto pulsante).
- `Card`: sem blur ou glow, com borda `line` e fundo `panel`.
- Novos componentes:
  - `Scoreboard`: placar de transmissão com time A, número e mapa ao centro, e time B. Aceita
    estado "ao vivo", "próxima partida" (contagem regressiva) e "encerrada".
  - `ActivityFeed`: faixa horizontal com eventos recentes.
  - `BracketView`: chaveamento em colunas por fase, desenhado a partir dos dados de partidas
    que a página do campeonato já recebe.
  - `CountdownTimer`.

## Telas desta etapa

### Home (`pages/HomePage.tsx`)

Ordem nova, de cima para baixo:

1. **Hero:** título e subtítulo com a proposta, mais dois botões (decisões minhas):
   - Visitante: "Inscrever minha equipe" (urgent) leva a `/criar-conta`, e "Ver campeonatos" a
     `/torneios`.
   - Logado como líder: "Inscrever minha equipe" leva ao campeonato aberto mais próximo, se
     houver, e "Abrir meu painel" ao painel.
   - Logado com outros papéis: só "Abrir meu painel" e "Ver campeonatos".

   Abaixo vem o `Scoreboard`:
   - Se existe partida com status ao vivo: placar ao vivo.
   - Senão, se existe partida agendada: próxima partida com contagem regressiva.
   - Senão: card do campeonato com inscrições abertas mais próximo.
   - Senão: o bloco não aparece.
   - A foto `arena-hero.png` sai do hero (decisão minha) e pode ser apagada se não for usada em
     outro lugar.
   O seletor de jogo atual ("Escolha sua arena") continua, como uma linha de chips logo abaixo do
   hero. Ele filtra tudo o que vem depois, como hoje.
2. **ActivityFeed:** últimos resultados, inscrições abertas e campeões recentes, a partir de
   `results`, `tournaments` e `champions` do portal. É escondido se estiver vazio.
3. **Campeonatos:** destaque com prêmio, inscrição, formato, início, barra de vagas e botão. A
   agenda vem logo abaixo, em tabela compacta.
4. **Ranking:** jogadores e equipes. Se todos tiverem 0 partidas, mostra uma chamada em vez da
   tabela: "O ranking começa na primeira rodada de DD/MM", com a menor data de `inicio` entre os
   torneios abertos ou criados do jogo filtrado. Sem essa data: "O ranking começa na primeira
   partida oficial." (decisão minha)
5. **Como funciona:** os 6 passos atuais, que formam uma sequência de verdade, então a numeração
   faz sentido.
6. Notícias e FAQ, se houver conteúdo.
7. Card final "Pronto para competir?", só para visitantes.
8. Rodapé.

Saem da home: o bloco duplicado "Plataforma em números", "Equipes em destaque" e "Jogadores em
destaque" (o ranking já cobre os dois) e "Hall da fama" quando estiver vazio. A barra fixa
inferior também sai, porque o feed substitui a função dela e ela causa rolagem horizontal.

Durante o carregamento: esqueletos (`Skeleton`), nunca zeros.

### Página do campeonato (`pages/TournamentDetailPage.tsx`)

- Topo: status (Badge), nome, uma linha de dados (prêmio, equipes, formato, data da final ou do
  início) e ações. "Inscrever equipe" (urgent) aparece se as inscrições estiverem abertas, e
  "Regulamento" sempre.
- Abas atuais mantidas, com a aba ativa marcada por uma barra âmbar embaixo.
- A aba "Chaveamento" usa `BracketView` (decisões minhas, com base nos dados que existem hoje,
  que são só `round` e `stage` por partida):
  - **Eliminação simples:** uma coluna por rodada. As rodadas futuras, que ainda não existem no
    banco, aparecem como vagas "A definir", calculadas a partir do número de equipes inscritas.
  - **Eliminação dupla, suíço, grupos e playoffs:** uma coluna por rodada, só com o que existe,
    agrupada por `stage` quando houver mais de um. Não há árvore de chave superior ou inferior
    porque o banco não marca isso, e fazer isso fica para outra etapa.
  - **Pontos corridos e liga:** continuam com a tabela de classificação atual, com o novo estilo.

### Painel do jogador (`pages/PlayerDashboardPage.tsx` + `features/player`)

- O módulo inicial ganha no topo o bloco **Próxima partida**: adversário, horário com
  `CountdownTimer`, formato e as ações que já existem hoje (presença na partida via
  `/player/workspace/matches/:id/attendance` e sala via `/player/workspace/matches/:id/room`).
- Sem partida agendada: convite ("Sua equipe não tem partidas marcadas. Ver campeonatos
  abertos").
- O resto do painel herda o visual via componentes.

### Layout comum

- `Navbar` e `Sidebar` com os novos tokens. O logo vira a mira com o ponto âmbar
  (`components/layout/Logo.tsx`).
- Item ativo do menu: barra lateral azul de 3px.

## Backend necessário

O portal (`GET /public/portal`, `models/publicPortal.model.js`) hoje só conta partidas ao vivo.
Ele ganha um campo:

```
featured_match: null | {
  id, tournament_id, tournament_name, status: "ao_vivo" | "agendada",
  team_a: { name, tag, logo }, team_b: { name, tag, logo },
  score_a, score_b, map_name | null, map_number | null, best_of | null,
  scheduled_at | null
}
```

A regra (confirmada no código: na tabela `matches`, ao vivo é `'andamento'` e agendada é
`'agendada'`, com `scheduled_at` que pode ser NULL) é:

1. a partida `'andamento'` mais recente;
2. senão, a partida `'agendada'` com `scheduled_at` no futuro mais próximo;
3. senão, uma partida `'agendada'` sem data de um torneio `em_andamento`. Nesse caso, o
   `Scoreboard` mostra "Horário a definir" no lugar da contagem (decisão minha: o gerador de
   chaves cria partidas sem data, e excluí-las esconderia o placar quase sempre);
4. senão, `null`.

O backend devolve `status` normalizado como `"ao_vivo"` ou `"agendada"`. Partidas de
`official_matches` (circuito oficial) **não** entram (decisão minha: têm página própria). O
campo é filtrado por jogo, como os demais.

O painel do jogador já recebe as partidas da equipe pelo workspace (com `status`,
`scheduled_at`, `best_of` e `opponent`), e `PlayerOverviewModules.tsx` já escolhe a próxima.
Não é preciso mudar o backend para isso: o bloco usa a mesma escolha.

## Textos

Corrigir acentos em todo texto visível das páginas públicas, dos componentes compartilhados, de
`i18n/translations.ts` e das funções de rótulo (`status`, `format` em `HomePage`). Exemplos:
"Competições", "Premiações", "Últimos", "Próximos", "Estatísticas", "Eliminação". A premiação
sempre aparece com "R$".

## Verificação

- `npm run build` no frontend e `npm test` no backend passando.
- Testes de backend para a regra do `featured_match` (ao vivo > agendada > nulo), com a query
  isolada numa função testável.
- `node scripts/visual-check.mjs` (já existe no frontend) e conferência manual em 1280px e
  375px: home, campeonato, painel do jogador, admin (só a herança visual).
- Sem rolagem horizontal em 375px.

## Deixado para quem implementar

- Escala exata dos tons de `cyan` remapeados e dos estados hover/active.
- Como desenhar as linhas de conexão do `BracketView`; com bordas ou SVG, tanto faz.
- Ícones: continuar com `lucide-react`.
- Divisão em commits.
