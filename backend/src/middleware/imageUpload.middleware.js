import multer from "multer";

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const INVALID_TYPE = "Envie uma imagem JPG, PNG, WebP ou GIF.";

const receiveImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize:MAX_IMAGE_BYTES, files:1 },
  fileFilter: (_request, file, callback) => ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.mimetype)
    ? callback(null, true)
    : callback(new Error(INVALID_TYPE))
}).single("image");

// O tipo informado pelo navegador pode ser falso; vale o que os primeiros bytes dizem.
export function detectImageType(buffer) {
  if (!buffer || buffer.length < 4) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  const head = buffer.subarray(0, 12).toString("latin1");
  if (head.startsWith("GIF87a") || head.startsWith("GIF89a")) return "image/gif";
  if (head.startsWith("RIFF") && head.slice(8, 12) === "WEBP") return "image/webp";
  return null;
}

export function uploadImage(req, res, next) {
  receiveImage(req, res, (error) => {
    if (error) {
      const tooLarge = error.code === "LIMIT_FILE_SIZE";
      return res.status(400).json({ erro:tooLarge ? `A imagem deve ter no maximo ${MAX_IMAGE_BYTES / 1024 / 1024} MB.` : error.message || INVALID_TYPE });
    }
    if (req.file) {
      const detected = detectImageType(req.file.buffer);
      if (!detected) return res.status(400).json({ erro:INVALID_TYPE });
      req.file.mimetype = detected;
    }
    next();
  });
}
