# Reconstrução do Arena Camp — documento de design

Data: 16/10/2026 · Base: `main` em `5603fd4` · Visual: identidade Transmissão (já no ar, mantida)
Referência visual do levantamento: `arena-camp-mapa.html` (fora do repo, entregue ao dono).

## Intenção

O dono acha o site "bagunçado em tudo" e quer algo **mais limpo, moderno, organizado e com cara de profissional**, mantendo o design atual. O levantamento mostrou que o problema é de organização, não de visual:

- 55 itens de menu e 4 painéis separados (jogador, líder, capitão, admin), com as mesmas seções repetidas.
- O menu público mistura páginas com filtros (Calendário, Resultados e Jogos são outras visões de Torneios).
- Há funções que não funcionam: o tradutor alcança 2 de 83 telas, o tema "Claro" é ignorado e `/design-system` está público.
- Criar torneio exige passar por várias telas espalhadas, e a abertura e o fechamento das inscrições são manuais.
- Dados velhos aparecem na tela: torneio cancelado no calendário, equipes inativas no ranking.

Referências estudadas: FACEIT, start.gg, Battlefy e Challengermode (a Gamers Club bloqueou a leitura).

## Decisões do dono

1. **Só português.** Sai o seletor de idioma e o sistema de tradução. Todo texto fica em pt-BR correto, com acentos.
2. **Ícone da aba:** opção 2, um quadrado âmbar `#FFB020` com cantos arredondados e a mira escura `#151C26` (anel e ponto). O SVG está no mapa.
3. **Estrutura aprovada como no mapa:**
   - Menu público com 5 itens.
   - Área única "Minha Arena" no lugar dos painéis de jogador, líder e capitão.
   - "Painel da organização" com 8 itens e layout próprio.
4. **Criação de torneio reorganizada:** 3 passos, rascunho com página própria, checklist de publicação, barra de etapas com uma única próxima ação, fechamento automático das inscrições e "Duplicar torneio".
5. **Transmissão dentro do site:** o admin cola o link da Twitch, YouTube ou Kick e o player oficial aparece dentro do site.

## Metas

- Cada coisa num só lugar, com nomes em português claro.
- Toda página com o mesmo cabeçalho (título, uma linha de descrição, ações à direita) e o mesmo jeito de mostrar estados vazios, carregando e erro.
- Os mesmos chips de status em todo lugar: Rascunho, Inscrições abertas, Inscrições encerradas, Ao vivo, Encerrado e Cancelado.
- O site nunca fica quebrado: cada fase vai ao ar sozinha e é testada, e os links antigos redirecionam.

## Fora do escopo

- Trocar a tecnologia. Continuam React, Vite, Tailwind, Express e MySQL, e a API existente é reaproveitada.
- Tema claro, outros idiomas, app de celular, sessão em cookie e 2FA obrigatório.
- Mudar as regras de negócio de pagamento, ranking ou chaveamento. A interface muda, a lógica fica.

## Anti-metas (o que seria fracasso)

- Perder alguma função que existe hoje. Antes de remover uma tela, o que ela faz precisa existir no lugar novo.
- Link antigo dando 404. `/jogador`, `/lider`, `/capitao`, `/team/:slug`, `/player/:slug`, `/calendario`, `/resultados`, `/circuito-oficial` e `/jogos` precisam redirecionar.
- Dados inventados na tela, ou texto em inglês visível.

## Estrutura

### Menu público (topo)

**Torneios · Circuito · Ranking · Comunidade · Notícias**. À direita ficam a busca (Ctrl K), "Entrar" e "Criar conta", ou o avatar com o menu "Minha Arena", "Painel da organização" (só para admin) e "Sair".

- **Torneios** (`/torneios`): abas Abertos · Em andamento · Encerrados · Calendário, mais o filtro de jogo. `/calendario` → `/torneios?aba=calendario` e `/resultados` → `/torneios?aba=encerrados`.
- **Circuito** (`/circuito`): o atual "circuito oficial". `/circuito-oficial` redireciona.
- **Ranking** (`/ranking`): jogadores e equipes, com filtro de jogo.
- **Comunidade** (`/comunidade`): abas Equipes e Jogadores. `/equipes` e `/jogadores` redirecionam para a aba certa. Os perfis ficam em `/equipe/:slug` e `/jogador/:slug`. `/team/...` e `/player/...` redirecionam.
- **Notícias** (`/noticias`).
- **Rodapé:** Sobre, Perguntas frequentes, Contato, Privacidade e Termos. "Jogos" sai do menu e vira filtro.

### Minha Arena (`/minha-arena`)

Menu lateral com 7 itens: **Início · Partidas · Torneios · Meu time · Carreira · Suporte · Configurações**. Para admin, aparece também o atalho "Painel da organização".

- **Início:** a próxima partida (com contagem regressiva) e **pendências** em cartões: pagar inscrição, check-in, veto em andamento, confirmar placar, convites e disputas. Cada cartão tem o botão que resolve aquilo.
- **Partidas:** a lista (próximas, ao vivo e encerradas) e a sala da partida, com presença, sala do Discord, veto, mensagens, envio de placar e disputa.
- **Torneios:** os torneios em que a pessoa ou o time está inscrito, com o status da inscrição.
- **Meu time:** visão do time, elenco, escalações, inscrições e pagamentos, calendário e mensagens do time. **As ações aparecem conforme o cargo:**
  - Líder: convidar, remover, transferir liderança, inscrever, pagar, editar o time e arquivar.
  - Capitão: escalação oficial, veto, presença e mensagens.
  - Jogador: ver e sair do time.
  - Sem time: buscar um time, ver convites ou criar um time.
- **Carreira:** estatísticas, conquistas e XP, e histórico.
- **Suporte:** tickets.
- **Configurações:** perfil, contas vinculadas (Discord e Steam), segurança (senha, 2FA, sessões) e notificações. Saem o tema e o idioma.

`/jogador`, `/lider` e `/capitao`, com ou sem `?module=`, redirecionam para a seção correspondente da Minha Arena. A troca de "contexto" de papel some da interface; o backend `/identity/context` continua existindo.

### Painel da organização (`/admin`)

Layout próprio, sem o menu público, com o botão "Ver site". Menu com 8 itens: **Hoje · Torneios · Partidas · Comunidade · Conteúdo · Financeiro · Acessos · Auditoria**.

- **Hoje:** fila do que pede ação (disputas, PIX parado, partidas sem sala, tickets abertos e torneios com etapa pendente), cada item com o botão que resolve, mais os números do dia.
- **Torneios:** lista, botão "Novo torneio" e a página de cada torneio (ver "Criação de torneio"). O Circuito oficial fica aqui como aba.
- **Partidas:** central de partidas (sala, veto, placar por mapa, súmula e transmissão).
- **Comunidade:** equipes, jogadores, punições, conquistas e XP, e o catálogo de jogos e mapas.
- **Conteúdo:** notícias, FAQ, parceiros e mensagens de contato.
- **Financeiro:** pagamentos e conciliação.
- **Acessos:** contas e permissões.
- **Auditoria.**

### Criação de torneio (fase 2)

1. **"Novo torneio" em 3 passos:**
   - **Básico:** nome, jogo, tipo (equipes ou Mix), formato, data de fechamento das inscrições, início e fim.
   - **Inscrições:** vagas, titulares e reservas, gratuito ou pago (com valor) e aprovação manual ou automática.
   - **Partidas:** melhor de 1, 3 ou 5, map pool e ordem de veto já preenchidos com o padrão do jogo.

   Ao terminar, o torneio é criado como **Rascunho** (sem status `aberto`).
2. **Página do torneio no painel**, com a barra de etapas e as abas Visão geral · Inscrições · Chave · Partidas · Regulamento · Transmissão · Configurações. Tudo o que hoje está espalhado em "Torneios e inscrições" e "Central de partidas" passa a ter acesso daqui.
3. **Checklist de publicação** na Visão geral. Os itens obrigatórios são informações básicas, inscrições, e mapas e veto. Os opcionais são premiação e banner. O regulamento é o resumo gerado das configurações. "Publicar e abrir inscrições" só fica ativo com os obrigatórios completos.
4. **Barra de etapas:**
   - Rascunho → Inscrições abertas → Inscrições encerradas → Chave gerada → Em andamento → Finalizado (e Cancelado fora da linha).
   - Cada etapa tem uma única ação principal: Publicar e abrir inscrições, Encerrar inscrições, Gerar chave, Iniciar torneio, Finalizar.
   - Mapeamento para o `tournaments.status` atual: rascunho = `criado`, inscrições abertas = `aberto`, encerradas = `fechado`. "Chave gerada" é derivada de existirem partidas com `status=fechado`. Em andamento = `em_andamento`, finalizado = `finalizado`.
5. **Fechamento automático:** um job no backend, no mesmo estilo da conciliação de pagamentos, a cada 5 minutos, passa para `fechado` os torneios `aberto` com `registration_closes_at` vencido e notifica os admins. Também roda ao iniciar o servidor.
6. **Duplicar torneio:** cria um rascunho com as mesmas configurações, map pool, veto, regulamento e premiação. O nome ganha "(cópia)", e as datas e as inscrições ficam vazias.

### Transmissão (fase 2)

- Campos novos: `tournaments.stream_url` (canal principal) e `matches.stream_url` (sobrepõe o do torneio na partida).
- Plataformas aceitas: Twitch (canal ou vídeo), YouTube (live, vídeo ou `youtu.be`) e Kick (canal). Uma função pura `toEmbed(url, parentHost)` transforma o link no endereço do player oficial ou devolve `null`. Ela é testada e usada no backend (validação ao salvar, com a mensagem "Use um link da Twitch, YouTube ou Kick") e no frontend (exibição).
- A Twitch exige `parent=<domínio>`. Usar o host atual da página, e `arenafps.com.br` e `www.arenafps.com.br` em produção.
- A CSP ganha `frame-src` apenas para `player.twitch.tv`, `www.youtube-nocookie.com`, `www.youtube.com` e `player.kick.com`.
- Exibição:
  - Na home, o placar ao vivo ganha "Assistir" e o player aparece abaixo dele.
  - Na página pública do torneio, uma faixa "Ao vivo" com o player quando houver partida `andamento` ou link do torneio.
  - Na sala da partida (Minha Arena e painel), o player no topo.
  - O player só carrega quando a pessoa clica em "Assistir" na home, para não pesar. Na página do torneio e da partida ele carrega direto.

### Correções e limpeza (fase 1)

- Ícone novo (opção 2) em `favicon.svg`.
- Remover o seletor de idioma, o `I18nProvider`, `translations.ts` e o atributo `translate="no"`. Os textos que usavam `t()` viram texto fixo em pt-BR.
- Remover a opção de tema, `utils/theme.ts` e os campos de tema na interface. O backend mantém a coluna.
- Remover a rota pública `/design-system`.
- Textos visíveis em inglês viram português: Workspace → Painel, Lineup → Escalação, Pick &amp; Ban → Veto de mapas, Competition Engine sai.
- Calendário, home e ranking ignoram torneios `cancelado` e equipes `ativo=0`.

## Ordem de entrega (cada fase é um PR que vai ao ar sozinho)

1. **Base e navegação:** ícone, menu público e rodapé novos, `PageHeader` e `StatusBadge` padronizados, Torneios com abas e calendário, Comunidade, redirecionamentos públicos, limpeza (idioma, tema, design-system, termos em inglês) e correção de dados velhos.
2. **Torneios e transmissão:** página pública do torneio com o "guia do jogador" (cartão lateral Inscrever, Pagar, Check-in, Ir para a partida), a transmissão, e a criação de torneio no painel (3 passos, página do torneio, checklist, etapas, fechamento automático, duplicar).
3. **Minha Arena:** área única com as 7 seções, ações por cargo, redirecionamentos de `/jogador`, `/lider` e `/capitao`, e remoção dos painéis antigos.
4. **Painel da organização:** layout próprio, "Hoje", menu de 8 itens e divisão de `AdminDashboardPage.tsx` em arquivos por seção.

## Restrições técnicas

- Banco: só acréscimos, via `ensureColumn` nos arquivos `database/ensure*.js` (`tournaments.stream_url`, `matches.stream_url`, `tournament_competition_settings.registration_closes_at`). Nada é apagado ou renomeado.
- A segurança atual se mantém: CSP, cabeçalhos, limites, `safeHref`. Toda URL nova passa por `optionalHttpUrl`.
- Lógica pura em `frontend/src/lib` e `backend/src/services|utils`, testada com `node --test`.
- Cada fase: `npm test` (backend e frontend), `tsc`, `vite build`, conferência no navegador em 1280px e 375px, e conferência no ar depois do deploy.

## Deixado para quem implementar

- O desenho exato dos componentes, dentro da identidade Transmissão.
- A divisão interna em arquivos e componentes.
- O texto dos estados vazios, seguindo a regra de sempre dizer o que fazer a seguir.

## Decisões tomadas após a revisão (decisão minha; o dono delegou as escolhas recomendadas)

1. **Fechamento automático** só muda `aberto` → `fechado` e avisa os admins, com quantas inscrições ainda estão pendentes ou não pagas. Inscrições pendentes **não** são canceladas e pagamentos que chegam depois seguem a regra atual. Quem decide é o admin, na aba Inscrições. **Torneio Mix não tem fechamento automático** (tem fluxo de sorteio próprio).
2. **A barra de etapas tem variantes:**
   - **Equipes:** a barra padrão.
   - **Mix:** Rascunho → Inscrições abertas → Sorteio → Em andamento → Finalizado, com a ação "Sortear equipes" (endpoint atual do Mix).
   - **Formato `custom`:** a etapa "Gerar chave" vira "Criar partidas", com link para a aba Partidas.

   Nenhuma regra do backend muda.
3. **"Chave gerada"** (correção): significa que o torneio tem ao menos uma partida. As partidas usam `agendada`, `andamento` e `finalizada`. A ação "Gerar chave" usa `POST /admin/competition/tournaments/:id/structure`, e as outras etapas usam `PATCH /tournaments/:id/status`.
4. **Regulamento:** é o resumo gerado das configurações (lado, pausa, W.O., desempate), que sempre existe. Por isso **sai da lista de obrigatórios**. Os obrigatórios ficam: informações básicas, inscrições, e mapas e veto. "Regulamento geral" **sai do rodapé**; ficam Perguntas frequentes, Sobre, Contato, Privacidade e Termos.
5. **Rascunho não aparece no site público.** As consultas públicas passam a ignorar `criado` e `cancelado`. Na lista de Torneios:
   - **Abertos:** `aberto`.
   - **Em andamento:** `fechado` (chip "Inscrições encerradas") e `em_andamento` (chip "Ao vivo").
   - **Encerrados:** `finalizado`.
6. **Meu time com mais de um time:** se a pessoa tem mais de um time, aparece um seletor de time no topo de "Meu time". Ele chama `/identity/context` por baixo, com o mesmo efeito da troca de contexto de hoje. Com um time só, o seletor não aparece.
7. **Mapa dos links antigos** (inclusive os salvos em notificações). Cada `module` dos painéis antigos tem destino:

   | Origem | Destino |
   |---|---|
   | `jogador` dashboard | Início |
   | `jogador` profile, settings | Configurações |
   | `jogador` teams, convites | Meu time |
   | `jogador` mix | Torneios |
   | `jogador` lineup | Meu time › Escalação |
   | `jogador` matches, calendar | Partidas |
   | `jogador` statistics, career | Carreira |
   | `jogador` messages | Meu time › Mensagens |
   | `jogador` support | Suporte |
   | `lider` dashboard | Início |
   | `lider` team, roster, lineups, ranking, communication, settings | Meu time, na aba correspondente |
   | `lider` tournaments, finance | Torneios / Meu time › Inscrições e pagamentos |
   | `lider` matches, calendar | Partidas |
   | `lider` history | Carreira |
   | `capitao` | Equivalentes do líder; `veto` vai para Partidas |

   O **ranking interno do time** vira a aba "Ranking" dentro de Meu time e não é removido.

   Os módulos antigos do admin (`competitions`, `operations`, `community`, `access`, `progression`, `content`, `official`, `finance`, `audit`) vão para as novas seções. `/admin/torneios/novo` vira o "Novo torneio" em 3 passos, e `/admin/mix/:id` vira a página do torneio no painel.

   `/team/:id` numérico: a busca pública da equipe passa a aceitar id numérico além do slug.
8. **Rascunho do "Novo torneio":** criar o torneio passa a ser uma única chamada no backend (torneio + configurações + map pool), em transação, para não deixar torneio pela metade.
