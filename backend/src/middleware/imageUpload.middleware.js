import multer from "multer";

export const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize:8 * 1024 * 1024 },
  fileFilter: (_request, file, callback) => ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.mimetype)
    ? callback(null, true)
    : callback(new Error("Envie uma imagem JPG, PNG, WebP ou GIF."))
}).single("image");
