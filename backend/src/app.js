import dotenv from "dotenv";

dotenv.config();

import express from "express";
import cors from "cors";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

import routes from "./routes/index.js";
import pool from "./config/database.js";
import { ensureAdminTables } from "./database/ensureAdminTables.js";
import { ensureCompetitionTables } from "./database/ensureCompetitionTables.js";
import { ensureLeaderTables } from "./database/ensureLeaderTables.js";
import { ensureCaptainTables } from "./database/ensureCaptainTables.js";
import { ensurePlayerTables } from "./database/ensurePlayerTables.js";
import { ensureIdentityTables } from "./database/ensureIdentityTables.js";
import { ensureAchievementTables } from "./database/ensureAchievementTables.js";
import { ensurePublicTables } from "./database/ensurePublicTables.js";
import { startPaymentReconciliation } from "./services/paymentReconciliation.service.js";

const app = express();
const uploadDirectory = path.resolve("uploads");
const sourceDirectory = path.dirname(fileURLToPath(import.meta.url));
const publicDirectories = [
 path.resolve(sourceDirectory, "../public"),
 path.resolve(sourceDirectory, "../../frontend/dist")
];
const publicDirectory = publicDirectories.find((directory) => fs.existsSync(path.join(directory, "index.html"))) || publicDirectories[0];
fs.mkdirSync(uploadDirectory, { recursive:true });

function validateProductionEnvironment() {
 if (process.env.NODE_ENV !== "production") return;

 const required = [
  "DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME", "JWT_SECRET",
  "FRONTEND_URL", "PUBLIC_API_URL", "SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD"
 ];
 const missing = required.filter((name) => !String(process.env[name] || "").trim());
 if (missing.length) throw new Error(`Variaveis de producao ausentes: ${missing.join(", ")}`);
 if (String(process.env.JWT_SECRET).length < 48) throw new Error("JWT_SECRET deve ter pelo menos 48 caracteres em producao.");
}

const productionOrigins = String(process.env.FRONTEND_URL || "")
 .split(",")
 .map((origin) => origin.trim().replace(/\/$/, ""))
 .filter(Boolean);

app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(cors({
 origin:process.env.NODE_ENV === "production"
  ? (origin, callback) => callback(null, !origin || productionOrigins.includes(origin.replace(/\/$/, "")))
  : true,
 credentials:true
}));

app.use(express.json());
app.use("/uploads", express.static(uploadDirectory, { maxAge:"7d", immutable:true }));

app.use(routes);

if (fs.existsSync(path.join(publicDirectory, "index.html"))) {
 app.use(express.static(publicDirectory, {
  maxAge:process.env.NODE_ENV === "production" ? "1y" : 0,
  immutable:process.env.NODE_ENV === "production",
  index:false
 }));
 app.use((req,res,next) => {
  if (req.method === "GET" && req.accepts("html")) {
   res.set({
    "Cache-Control":"no-store, no-cache, must-revalidate, proxy-revalidate",
    Pragma:"no-cache",
    Expires:"0",
    "Surrogate-Control":"no-store"
   });
   return res.sendFile(path.join(publicDirectory, "index.html"));
  }
  return next();
 });
}

app.use((err,req,res,next) => {
 if (res.headersSent) return next(err);
 console.error(err);
 return res.status(err.status || 500).json({ erro:process.env.NODE_ENV === "production" ? "Nao foi possivel concluir a solicitacao." : err.message });
});

async function start() {

 try {

  validateProductionEnvironment();

  await pool.query("SELECT 1");
  await ensureAdminTables();
  await ensureCompetitionTables();
  await ensureLeaderTables();
  await ensureCaptainTables();
  await ensurePlayerTables();
  await ensureIdentityTables();
  await ensureAchievementTables();
  await ensurePublicTables();

  console.log("BANCO CONECTADO");

  const server = app.listen(

   Number(process.env.PORT) || 4000,

   () => {

   console.log("Servidor iniciado");
   startPaymentReconciliation();

   }

  );

  const shutdown = () => server.close(() => pool.end().finally(() => process.exit(0)));
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);

 }

 catch (err) {

  console.log("ERRO BANCO");

  console.log(err);

 }

}

start();
