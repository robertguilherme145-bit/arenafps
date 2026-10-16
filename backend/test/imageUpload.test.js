import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import { detectImageType, MAX_IMAGE_BYTES, uploadImage } from "../src/middleware/imageUpload.middleware.js";

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);
const GIF = Buffer.from("GIF89a....", "latin1");
const WEBP = Buffer.concat([Buffer.from("RIFF", "latin1"), Buffer.alloc(4), Buffer.from("WEBPVP8 ", "latin1")]);

test("reconhece imagens pelo conteudo", () => {
  assert.equal(detectImageType(PNG), "image/png");
  assert.equal(detectImageType(JPG), "image/jpeg");
  assert.equal(detectImageType(GIF), "image/gif");
  assert.equal(detectImageType(WEBP), "image/webp");
  assert.equal(detectImageType(Buffer.from("<html><script>alert(1)</script>")), null);
  assert.equal(detectImageType(Buffer.alloc(0)), null);
});

async function upload(buffer, type, name = "foto.png") {
  const app = express();
  app.post("/up", uploadImage, (req, res) => res.json({ mime:req.file.mimetype, size:req.file.size }));
  const server = await new Promise((resolve) => { const s = app.listen(0, "127.0.0.1", () => resolve(s)); });
  try {
    const form = new FormData();
    form.append("image", new Blob([buffer], { type }), name);
    const response = await fetch(`http://127.0.0.1:${server.address().port}/up`, { method:"POST", body:form });
    return { status:response.status, body:await response.json() };
  } finally { server.close(); }
}

test("aceita imagem real e usa o tipo detectado", async () => {
  const result = await upload(JPG, "image/png", "foto.png");
  assert.equal(result.status, 200);
  assert.equal(result.body.mime, "image/jpeg");
});

test("recusa HTML disfarcado de imagem", async () => {
  const result = await upload(Buffer.from("<html><script>alert(1)</script></html>"), "image/png");
  assert.equal(result.status, 400);
  assert.match(result.body.erro, /imagem/i);
});

test("recusa arquivo grande com mensagem clara", async () => {
  const result = await upload(Buffer.concat([PNG, Buffer.alloc(MAX_IMAGE_BYTES)]), "image/png");
  assert.equal(result.status, 400);
  assert.match(result.body.erro, /MB/);
});
