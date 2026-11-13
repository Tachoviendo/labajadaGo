import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import Fastify from "fastify";
import errorHandler from "../plugins/errorHandler.js";
import jwtPlugin from "../plugins/jwt.js";
import productRoutes from "../src/routes/products.routes.js";

const apps = [];
const envOriginal = {
  FASTIFY_SECRET: process.env.FASTIFY_SECRET,
  BUCKET_URL: process.env.BUCKET_URL,
  BUCKET_PUBLIC_URL: process.env.BUCKET_PUBLIC_URL,
  BUCKET_TOKEN: process.env.BUCKET_TOKEN,
};
const fetchOriginal = globalThis.fetch;

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
  globalThis.fetch = fetchOriginal;
  for (const [clave, valor] of Object.entries(envOriginal)) {
    if (valor === undefined) delete process.env[clave];
    else process.env[clave] = valor;
  }
});

const normalizar = (sql) => sql.replace(/\s+/g, " ").trim();
const esLecturaDeProducto = (sql) =>
  /FROM producto p INNER JOIN categoria c ON c\.id = p\.categoria_id WHERE p\.id = \$1$/.test(normalizar(sql));
const esUpdateDeImagen = (sql) =>
  normalizar(sql) === "UPDATE producto SET imagen_url = $1 WHERE id = $2 RETURNING id";

const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(32, 1),
]);
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(32, 2)]);

async function createApp({ bucketStatus = 201 } = {}) {
  process.env.FASTIFY_SECRET = "products-imagen-test-secret";
  process.env.BUCKET_URL = "http://bucket.test:3001";
  process.env.BUCKET_PUBLIC_URL = "http://localhost:3001";
  process.env.BUCKET_TOKEN = "token-de-prueba";

  const productos = new Map([
    [1, { id: 1, nombre: "Agua", descripcion: null, precio: 60, categoria_id: 1,
      categoria_nombre: "Bebidas", categoria_descripcion: null, imagen_url: null, stock: 10, activo: true }],
  ]);
  const calls = [];
  const subidas = [];

  const pg = {
    async query(sql, values) {
      calls.push({ sql: normalizar(sql), values });
      if (esLecturaDeProducto(sql)) {
        const row = productos.get(values[0]);
        return { rows: row ? [{ ...row }] : [] };
      }
      if (esUpdateDeImagen(sql)) {
        const row = productos.get(values[1]);
        if (!row) return { rows: [] };
        row.imagen_url = values[0];
        return { rows: [{ id: row.id }] };
      }
      throw new Error(`Consulta inesperada: ${sql}`);
    },
  };

  globalThis.fetch = async (url, init) => {
    const archivo = init.body.get("file");
    subidas.push({
      url,
      token: init.headers["x-bucket-token"],
      tipo: archivo.type,
      bytes: Buffer.from(await archivo.arrayBuffer()),
    });
    return new Response(JSON.stringify({ filename: "abc-123.png" }), {
      status: bucketStatus,
      headers: { "content-type": "application/json" },
    });
  };

  const app = Fastify();
  app.decorate("pg", pg);
  app.register(errorHandler);
  app.register(jwtPlugin);
  app.register(productRoutes, { prefix: "/api" });
  await app.ready();
  apps.push(app);
  return { app, calls, subidas, productos };
}

function multipart(contenido, tipo, nombre = "foto.png") {
  const boundary = "----limite-de-prueba";
  const payload = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${nombre}"\r\n` +
        `Content-Type: ${tipo}\r\n\r\n`,
    ),
    contenido,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  return { payload, headers: { "content-type": `multipart/form-data; boundary=${boundary}` } };
}

function subir(app, { rol = "dueno", id = 1, contenido = PNG, tipo = "image/png", sinToken = false } = {}) {
  const { payload, headers } = multipart(contenido, tipo);
  if (!sinToken) {
    headers.authorization = `Bearer ${app.jwt.sign({ id: 9, rol }, { expiresIn: "1h" })}`;
  }
  return app.inject({ method: "POST", url: `/api/productos/${id}/imagen`, payload, headers });
}

test("POST /productos/:id/imagen sube al bucket y guarda la url publica", async () => {
  const { app, subidas, productos } = await createApp();

  const response = await subir(app);

  assert.equal(response.statusCode, 200);
  assert.equal(response.json().imagenUrl, "http://localhost:3001/abc-123.png");
  assert.equal(productos.get(1).imagen_url, "http://localhost:3001/abc-123.png");
  assert.equal(subidas.length, 1);
  assert.equal(subidas[0].url, "http://bucket.test:3001/");
  assert.equal(subidas[0].token, "token-de-prueba");
  assert.equal(subidas[0].tipo, "image/png");
  assert.ok(subidas[0].bytes.equals(PNG));
});

test("POST /productos/:id/imagen acepta jpeg", async () => {
  const { app } = await createApp();
  const response = await subir(app, { contenido: JPEG, tipo: "image/jpeg" });
  assert.equal(response.statusCode, 200);
});

test("POST /productos/:id/imagen exige token y rol dueño", async () => {
  const { app, subidas } = await createApp();

  assert.equal((await subir(app, { sinToken: true })).statusCode, 401);
  assert.equal((await subir(app, { rol: "cliente" })).statusCode, 403);
  assert.equal((await subir(app, { rol: "cajero" })).statusCode, 403);
  assert.equal(subidas.length, 0);
});

test("POST /productos/:id/imagen rechaza tipos no permitidos y archivos que no son imagen", async () => {
  const { app, subidas, productos } = await createApp();

  const gif = await subir(app, { contenido: Buffer.from("GIF89a-------"), tipo: "image/gif" });
  assert.equal(gif.statusCode, 400);

  const disfrazado = await subir(app, { contenido: Buffer.from("<script>alert(1)</script>"), tipo: "image/png" });
  assert.equal(disfrazado.statusCode, 400);

  assert.equal(subidas.length, 0);
  assert.equal(productos.get(1).imagen_url, null);
});

test("POST /productos/:id/imagen rechaza imagenes de mas de 2 MB", async () => {
  const { app, subidas } = await createApp();
  const grande = Buffer.concat([PNG, Buffer.alloc(2 * 1024 * 1024, 0)]);

  const response = await subir(app, { contenido: grande });

  assert.equal(response.statusCode, 413);
  assert.equal(subidas.length, 0);
});

test("POST /productos/:id/imagen devuelve 404 si el producto no existe, sin subir nada", async () => {
  const { app, subidas } = await createApp();
  const response = await subir(app, { id: 99 });
  assert.equal(response.statusCode, 404);
  assert.equal(subidas.length, 0);
});

test("POST /productos/:id/imagen devuelve 502 si el bucket falla y no toca la base", async () => {
  const { app, calls, productos } = await createApp({ bucketStatus: 500 });
  const response = await subir(app);
  assert.equal(response.statusCode, 502);
  assert.equal(productos.get(1).imagen_url, null);
  assert.equal(calls.some((c) => esUpdateDeImagen(c.sql)), false);
});
