import { randomUUID, timingSafeEqual } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import Fastify from "fastify";
import fastifyMultipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";

//bucket de imagenes: GET /<archivo> es publico (lo usan los <img> del front),
//POST / solo lo usa la api, con el header x-bucket-token = BUCKET_TOKEN.
//asi nadie puede subir archivos directo desde el navegador
const STORAGE_DIR = path.resolve(process.env.BUCKET_STORAGE_DIR || "./storage");
const TOKEN = process.env.BUCKET_TOKEN;
const PORT = Number(process.env.BUCKET_PORT || 3001);
const MAX_BYTES = 2 * 1024 * 1024;

//la extension la decide el tipo, no el nombre que manda el cliente
const EXTENSIONES = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

if (!TOKEN) throw new Error("No especificaste BUCKET_TOKEN");
fs.mkdirSync(STORAGE_DIR, { recursive: true });

function tokenValido(recibido) {
  if (typeof recibido !== "string") return false;
  const a = Buffer.from(recibido);
  const b = Buffer.from(TOKEN);
  return a.length === b.length && timingSafeEqual(a, b);
}

const app = Fastify({ logger: { level: process.env.BUCKET_LOG_LEVEL || "info" } });

app.register(fastifyMultipart, { limits: { fileSize: MAX_BYTES, files: 1 } });

app.register(fastifyStatic, {
  root: STORAGE_DIR,
  prefix: "/",
  //no listar el directorio ni servir archivos ocultos
  index: false,
  dotfiles: "deny",
  maxAge: "7d",
});

app.post("/", async (request, reply) => {
  if (!tokenValido(request.headers["x-bucket-token"])) {
    return reply.code(401).send({ message: "token de bucket inválido" });
  }

  const data = await request.file();
  if (!data) {
    return reply.code(400).send({ message: "no se envió ningún archivo" });
  }

  const extension = EXTENSIONES[data.mimetype];
  if (!extension) {
    data.file.resume();
    return reply.code(415).send({ message: "solo se aceptan imágenes jpeg, png o webp" });
  }

  const filename = `${randomUUID()}${extension}`;
  const destino = path.join(STORAGE_DIR, filename);
  await pipeline(data.file, fs.createWriteStream(destino));

  //si se paso del limite, multipart corta el stream y marca truncated
  if (data.file.truncated) {
    await fs.promises.rm(destino, { force: true });
    return reply.code(413).send({ message: "la imagen supera los 2 MB" });
  }

  return reply.code(201).send({ filename });
});

try {
  await app.listen({ port: PORT, host: "0.0.0.0" });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
