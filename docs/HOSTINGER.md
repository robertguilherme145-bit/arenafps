# Implantacao na Hostinger

O pacote `deploy/hostinger.zip` contem uma aplicacao Express unica. O backend serve a API, os uploads e o frontend React compilado no mesmo dominio.

O repositorio GitHub tambem pode ser conectado diretamente. Nesse modo use a raiz do repositorio, comando de build `npm run build` e arquivo de entrada `backend/src/app.js`. Cada push na branch conectada gera uma nova implantacao automatica.

## Configuracao do Web App

- Framework: Express
- Node.js: 22.x
- Diretorio raiz: raiz do projeto (`.` ou vazio, conforme o formulario)
- Arquivo de entrada: `src/app.js`
- Gerenciador: npm
- Comando de inicio: `npm start` (quando solicitado)

## Variaveis obrigatorias

Cadastre os valores diretamente no hPanel. Nunca envie o arquivo `.env` no ZIP.

```text
NODE_ENV=production
FRONTEND_URL=https://arenafps.com.br,https://www.arenafps.com.br
PUBLIC_API_URL=https://arenafps.com.br
DB_HOST=
DB_PORT=3306
DB_USER=
DB_PASSWORD=
DB_NAME=
JWT_SECRET=
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=arenafpseventos@gmail.com
SMTP_PASSWORD=
SMTP_FROM=Arena Camp <arenafpseventos@gmail.com>
MP_PUBLIC_KEY=
MP_ACCESS_TOKEN=
MP_WEBHOOK_URL=https://arenafps.com.br/payment/webhook
MP_WEBHOOK_SECRET=
PAYMENT_RECONCILIATION_INTERVAL_MS=15000
```

O `PORT` deve ser o valor fornecido pela Hostinger. Se a plataforma o injeta automaticamente, nao o duplique.

## Depois da implantacao

1. Abra `https://arenafps.com.br/api/health` e confirme `status: online`.
2. Teste cadastro, verificacao de email e recuperacao de senha.
3. Cadastre o webhook do Mercado Pago como `https://arenafps.com.br/payment/webhook`.
4. Teste upload de uma imagem e confirme que ela continua acessivel apos reiniciar o Web App.
5. Verifique login, criacao de equipe, inscricao e pagamento com uma transacao de valor minimo.

Uploads ficam no diretorio local `uploads`. Antes de qualquer reimplantacao futura, faca backup desse diretorio. Para armazenamento permanente independente do deploy, migre depois para object storage.
