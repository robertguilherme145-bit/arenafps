# Arena Camp

Plataforma de competicoes de eSports com portal publico, conta unica, contextos
por jogo e workspaces de jogador, capitao, lider, organizador e administrador.

## Executar localmente

Use dois terminais:

```powershell
cd backend
npm install
npm run dev
```

```powershell
cd frontend
npm install
npm run dev
```

- Portal e frontend: `http://localhost:5173`
- API: `http://localhost:4000`
- Configuracao: copie os valores necessarios de `backend/.env.example` e
  `frontend/.env.example` para os arquivos `.env` locais.

## Verificacao

```powershell
cd backend
npm test
npm run test:smoke-auth
```

```powershell
cd frontend
npm run build
node scripts/visual-check.mjs
```

O smoke test cria uma conta temporaria, confirma o email, valida login, bloqueio
de replay OAuth e onboarding, e remove a conta ao terminar.

## Conta unica e OAuth

Uma conta pode acumular os papeis `jogador`, `lider`, `capitao`, `organizador`
e `admin`. O seletor do topo alterna papel, equipe e jogo sem duplicar login.

Google e Discord usam OAuth 2.0. Steam usa OpenID 2.0. Os callbacks e credenciais
ficam no `.env`; o retorno utiliza um codigo descartavel de dois minutos, nunca o
JWT definitivo na URL. Contas Steam completam email e jogos no primeiro acesso.

## Portal publico

O portal consulta dados reais de torneios, resultados, rankings, equipes,
jogadores, campeoes, noticias, FAQ e chaveamentos. Conteudo editorial,
conquistas, acessos, jogos e metas sao administrados no backoffice.

## Confirmacao automatica do PIX

Pagamentos PIX incluem o Webhook do Mercado Pago quando `PUBLIC_API_URL` ou
`MP_WEBHOOK_URL` esta configurado. O receiver e `POST /payment/webhook` e usa
`MP_WEBHOOK_SECRET` para validar notificacoes assinadas.

O workspace do lider tambem reconcilia pagamentos pendentes pelo endpoint
autenticado `POST /leader/payments/sync`, inclusive em desenvolvimento local.

Como fallback, o backend reconcilia pagamentos a cada 15 segundos. A variavel
`PAYMENT_RECONCILIATION_INTERVAL_MS` ajusta esse intervalo.

Em producao, a URL do Webhook deve ser publica e usar HTTPS.
