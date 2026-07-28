import path from "node:path";
import pool from "../config/database.js";

function safeFilename(value) {
  const extension = path.extname(value || "").toLowerCase();
  const basename = path.basename(value || "imagem", extension).replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "imagem";
  return `${basename}${extension}`;
}

export async function upload(req, res) {
  if (!req.file) return res.status(400).json({ erro:"Selecione uma imagem." });
  const filename = safeFilename(req.file.originalname);
  const [result] = await pool.query(
    `INSERT INTO media_assets (original_name,mime_type,file_size,file_data,created_by) VALUES (?,?,?,?,?)`,
    [filename, req.file.mimetype, req.file.size, req.file.buffer, req.user?.id || null]
  );
  const baseUrl = String(process.env.PUBLIC_API_URL || `${req.protocol}://${req.get("host")}`).replace(/\/$/, "");
  return res.status(201).json({ url:`${baseUrl}/media/files/${result.insertId}/${encodeURIComponent(filename)}`, filename, mime_type:req.file.mimetype, size:req.file.size });
}

export async function show(req, res) {
  const [rows] = await pool.query(`SELECT mime_type,file_size,file_data,created_at FROM media_assets WHERE id=? LIMIT 1`, [req.params.id]);
  if (!rows.length) return res.status(404).send("Imagem nao encontrada.");
  const asset = rows[0];
  res.set({
    "Content-Type": asset.mime_type,
    "Content-Length": asset.file_size,
    "Cache-Control":"public, max-age=31536000, immutable",
    ETag:`\"media-${req.params.id}-${asset.file_size}\"`
  });
  if (req.headers["if-none-match"] === `\"media-${req.params.id}-${asset.file_size}\"`) return res.status(304).end();
  return res.send(asset.file_data);
}
