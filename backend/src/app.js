import dotenv from "dotenv";

dotenv.config();

import express from "express";
import cors from "cors";

import routes from "./routes/index.js";
import pool from "./config/database.js";

const app = express();

app.use(cors());

app.use(express.json());

app.use(routes);

async function start() {

 try {

  await pool.query("SELECT 1");

  console.log("BANCO CONECTADO");

  app.listen(

   process.env.PORT,

   () => {

    console.log("Servidor iniciado");

   }

  );

 }

 catch (err) {

  console.log("ERRO BANCO");

  console.log(err);

 }

}

start();