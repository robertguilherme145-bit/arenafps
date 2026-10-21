import { randomBytes } from "node:crypto";
import { createReceipt, findReceipt } from "../models/paymentReceipt.model.js";
import { receiptUrlFor } from "../utils/receiptUrl.js";

// Comprovantes ficam fora da galeria publica de imagens: codigo impossivel de adivinhar
// e so quem enviou ou um admin consegue abrir.
export async function upload(req, res) {
  if (!req.file) return res.status(400).json({ erro:"Selecione a imagem do comprovante." });
  const token = randomBytes(16).toString("hex");
  await createReceipt({ token, userId:req.user.id, mimeType:req.file.mimetype, size:req.file.size, data:req.file.buffer });
  return res.status(201).json({ url:receiptUrlFor(token) });
}

export async function show(req, res) {
  const token = String(req.params.token ?? "");
  if (!/^[0-9a-f]{32}$/.test(token)) return res.status(404).json({ erro:"Comprovante nao encontrado." });
  const receipt = await findReceipt(token);
  const allowed = receipt && (req.user.roles?.includes("admin") || Number(receipt.user_id) === Number(req.user.id));
  if (!allowed) return res.status(404).json({ erro:"Comprovante nao encontrado." });
  res.set({ "Content-Type":receipt.mime_type, "Content-Length":String(receipt.file_size), "Cache-Control":"private, no-store", "Content-Disposition":"inline" });
  return res.send(receipt.file_data);
}
