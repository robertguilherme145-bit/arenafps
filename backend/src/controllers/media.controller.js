export function upload(req, res) {
  if (!req.file) return res.status(400).json({ erro:"Selecione uma imagem." });
  const baseUrl = String(process.env.PUBLIC_API_URL || `${req.protocol}://${req.get("host")}`).replace(/\/$/, "");
  return res.status(201).json({ url:`${baseUrl}/uploads/${req.file.filename}`, filename:req.file.filename, mime_type:req.file.mimetype, size:req.file.size });
}
