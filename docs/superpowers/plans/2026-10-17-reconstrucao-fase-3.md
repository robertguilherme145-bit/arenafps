# Reconstrução — Fase 3: Minha Arena

Objetivo: trocar os painéis de jogador, líder e capitão por uma área única, `/minha-arena`, com 7 seções. Nenhuma função some: os módulos atuais são reaproveitados dentro das novas seções.

## Decisões de construção (minhas)

- Os módulos dos painéis antigos continuam sendo os mesmos componentes. Cada painel vira um "espaço" embutível (`LeaderArena`, `CaptainArena`, `PlayerArena`) que recebe o módulo por propriedade e não desenha cabeçalho próprio.
- O cargo no time ativo (`user.team_contexts` + `user.active_team_id`) decide quais abas e ações aparecem. Sem time: "nenhum".
- O seletor de time (só com mais de um time) chama `switchContext({ role, team_id })`.
- Endereços: `/minha-arena` (Início), `/minha-arena/partidas`, `/torneios`, `/time`, `/carreira`, `/suporte`, `/configuracoes`, com `?aba=`.
- `/jogador`, `/lider` e `/capitao` redirecionam pela tabela da especificação e **mantêm os outros parâmetros** (ex.: retorno do PayPal com `token` e `PayerID`). Os links já gravados em notificações continuam funcionando por esse redirecionamento.
- A barra lateral ganha a área "arena"; no celular, as seções aparecem como abas no topo da página.

## Tarefas

1. `lib/minhaArena.ts` (sem dependências) + testes: seções, abas por cargo, `teamRoleOf`, `legacyArenaPath`.
2. Painéis viram espaços embutíveis em `features/arena/` (git mv), com `module` por propriedade e `openModule` que navega pelo mapa.
3. `pages/MinhaArenaPage.tsx` + rota `/minha-arena/:secao?` (exige login) + redirecionamentos.
4. Navbar, Sidebar, navegação e trilha apontam para a Minha Arena; remover as navegações antigas.
5. tsc, testes, build, preview, PR, merge, conferência no ar.
