# Reconstrução — Fase 4: Painel da organização

Objetivo: painel com 8 seções (Hoje, Torneios, Partidas, Comunidade, Conteúdo, Financeiro, Acessos, Auditoria) e uma fila "Hoje" com o que pede ação.

## Feito nesta fase

1. `lib/adminSections.ts` + testes: seções, abas e mapa dos links antigos `?module=` (mantém `torneio`, `game`, `status`).
2. Backend: `GET /admin/today` (só admin). `services/adminToday.js` monta a fila a partir dos dados (testado); `models/adminToday.model.js` lê disputas abertas, PIX pendentes, partidas das próximas/últimas 24h sem servidor nem sala do Discord, chamados abertos, mensagens de contato novas e torneios com etapa parada.
3. `features/admin/TodayQueue.tsx`: números do dia + fila "Precisa de você", atualizando a cada minuto. Substitui o quadro "Prioridades agora".
4. Rotas `/admin` e `/admin/:secao`; `?module=` redireciona. Menu lateral com os 8 itens, abas no celular, trilha e links do servidor nos endereços novos.
5. Divisão do `AdminDashboardPage.tsx`: funções auxiliares em `features/admin/adminShared.tsx`; Financeiro e Auditoria em `features/admin/sections/`.

## Para depois (sem mudança visível)

- Continuar a divisão: Torneios, Partidas, Comunidade, Conteúdo e Acessos ainda dividem o mesmo estado no `AdminDashboardPage.tsx` (~3,3 mil linhas). Cada seção precisa carregar os próprios dados antes de ir para um arquivo.
