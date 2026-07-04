🏆 Arena Camp - Roadmap Oficial

Versão: 1.0 (Início da documentação oficial)

Objetivo

A Arena Camp será uma plataforma completa de gerenciamento de campeonatos de eSports, permitindo criação de torneios, gerenciamento de equipes, jogadores, partidas, estatísticas, rankings e acompanhamento completo das competições.

✅ FASE 1 — CORE (CONCLUÍDA)

Esta fase representa o núcleo da plataforma.

🔐 Autenticação

Status: ✅ Concluído

Funcionalidades
Cadastro de usuários
Login
JWT
Middleware de autenticação
Controle de permissões
Admin
Usuário
👥 Equipes

Status: ✅ Concluído

Funcionalidades
Criar equipe
Editar equipe
Solicitar entrada
Aceitar solicitação
Rejeitar solicitação
Líder
Capitão
Jogador
Alterar cargo
Permissões
🎮 Players

Status: ✅ Concluído

Cada usuário possui um Player para cada jogo.

Funcionalidades
Nick
UID
Foto
Status
Histórico futuro
🏆 Torneios

Status: ✅ Base pronta

Funcionalidades atuais
Criar
Editar
Listar
Valor da inscrição
Máximo de equipes
Titulares
Reservas
Datas
Melhoria planejada

Fluxo automático:

Criar

↓

Aberto

↓

Atingiu máximo

↓

Fechado

↓

Admin inicia

↓

Andamento

↓

Última partida

↓

Finalizado

↓

(Admin)

Cancelado
📝 Inscrições

Status: ✅ Concluído

Funcionalidades
Criar inscrição
Validar equipe
Validar torneio
Controle de status
Controle de pagamento
💳 Pagamentos

Status: ✅ Concluído

Produção validada.

Funcionalidades
Mercado Pago
PIX
QR Code
Webhook
Aprovação automática
Confirma inscrição
👥 Lineup

Status: ✅ Concluído

Funcionalidades
Titulares
Reservas
Ordem
Permissões
Apenas Leader/Captain
Validação automática
⚔ Match

Status: ✅ Concluído

Funcionalidades
Criar partida
Listar partidas
Registrar resultado
Definir vencedor
Finalizar partida
🎯 Fluxo completo validado
Cadastro

↓

Login

↓

Criar Equipe

↓

Entrar na Equipe

↓

Criar Players

↓

Inscrição

↓

Pagamento PIX

↓

Webhook

↓

Lineup

↓

Criar Match

↓

Resultado

Fluxo testado integralmente.

🚧 FASE 2 — Motor de Campeonatos

Status: 🔲 Planejado

Nesta fase a Arena Camp deixa de ser apenas um sistema de torneios.

Ela passa a ser um motor de competições.

Formatos
Swiss

Status:

⬜

Recursos

Sistema 0-0
1-0
2-0
3-0
0-3
Pareamento automático
Round Robin

Status

⬜

Recursos

Todos contra todos
Pontos corridos
Ida
Volta
Saldo
Single Elimination

Status

⬜

Recursos

Quartas
Semi
Final
Double Elimination

Status

⬜

Recursos

Winner Bracket
Loser Bracket
Grand Final
Group Stage

Status

⬜

Recursos

Grupos
Classificação
Avanço
🎮 Série de partidas

Status

⬜

Cada fase poderá definir:

MD1

MD3

MD5

MD7

Exemplo

Swiss

MD1

↓

Quartas

MD3

↓

Semi

MD3

↓

Final

MD5
🗺 Sistema de Mapas

Status

⬜

Cada jogo possuirá seu mapa.

Tabela:

Maps

Exemplo:

Sudden Attack

Old Town
Dragon Road
Third Supply
Factory

Counter Strike

Mirage
Inferno
Nuke

Valorant

Ascent
Haven
🎯 Pick & Ban

Status

⬜

Fluxo

Ban

↓

Ban

↓

Pick

↓

Pick

↓

Decider
📊 Estatísticas

Status

⬜

Cada partida armazenará:

Kills

Deaths

Assists

Headshots

ADR

KAST

Damage

Flash Assist

Opening Kill

Clutch

Ace

MVP

🏅 Histórico

Status

⬜

Cada equipe terá:

Histórico

↓

Campeonatos

↓

Partidas

↓

Resultados

↓

Troféus

Cada jogador terá

Histórico

↓

Kills

↓

MVPs

↓

HS%

↓

K/D

↓

Ranking

🏆 Rankings

Status

⬜

Ranking de equipes

Ranking de jogadores

Ranking por jogo

Ranking por temporada

🌐 Portal Público

Status

⬜

Página inicial

Torneios

Partidas

Calendário

Resultados

Ranking

Jogadores

Equipes

👨‍💻 Painel Admin

Status

⬜

Dashboard

Criar torneios

Gerenciar equipes

Gerenciar partidas

Gerenciar mapas

Gerenciar formatos

Gerenciar temporadas

👥 Painel Líder

Status

⬜

Equipe

Solicitações

Players

Inscrições

Pagamentos

Lineup

Histórico

🎮 Painel Jogador

Status

⬜

Perfil

Estatísticas

Times

Histórico

Conquistas

🏅 Perfil Público

Status

⬜

Equipe

Logo

Jogadores

Campeonatos

Vitórias

Derrotas

Troféus

Jogador

Nick

Kills

HS

MVP

Ranking

Histórico

📰 Portal Arena Camp

Status

⬜

Notícias

Resultados

Calendário

Jogos ao vivo

Equipe destaque

Jogador destaque

🎥 Futuro

Status

⬜

Integração Twitch

Integração YouTube

Demo

Replay

VOD

🧠 Arquitetura
Núcleo (não deve ser refeito)
Users

↓

Teams

↓

Players

↓

Tournament

↓

Entry

↓

Payment

↓

Entry Players

↓

Match

Essa estrutura foi validada e será mantida.