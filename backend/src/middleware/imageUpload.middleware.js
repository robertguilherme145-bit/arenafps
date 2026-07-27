import crypto from "node:crypto";
import path from "node:path";
import multer from "multer";

const storage = multer.diskStorage({
  destination: path.resolve("uploads"),
  filename: (_request, file, callback) => callback(null, `${Date.now()}-${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`)
});

export const uploadImage = multer({
  storage,
  limits: { fileSize:8 * 1024 * 1024 },
  fileFilter: (_request, file, callback) => ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.mimetype)
    ? callback(null, true)
    : callback(new Error("Envie uma imagem JPG, PNG, WebP ou GIF."))
}).single("image");
