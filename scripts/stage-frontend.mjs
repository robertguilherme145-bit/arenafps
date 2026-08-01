import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(repositoryRoot, "frontend", "dist");
const destination = path.join(repositoryRoot, "backend", "public");

if (!fs.existsSync(path.join(source, "index.html"))) {
  throw new Error(`Frontend compilado nao encontrado em ${source}`);
}

fs.rmSync(destination, { recursive: true, force: true });
fs.cpSync(source, destination, { recursive: true });

console.log(`Frontend preparado para producao em ${destination}`);
