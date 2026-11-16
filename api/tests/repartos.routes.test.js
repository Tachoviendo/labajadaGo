import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import Fastify from "fastify";
import errorHandler from "../plugins/errorHandler.js";
import jwtPlugin from "../plugins/jwt.js";
import orderRoutes from "../src/routes/orders.routes.js";
import repartosRoutes from "../src/routes/repartos.routes.js";

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

//ids: 3 cliente, 8 cajero, 20 y 21 repartidores
const CLIENTE = 3;
const CAJERO = 8;
const PEDRO = 20;
const OTRO_REPARTIDOR = 21;

const normalizar = (sql) => sql.replace(/\s+/g, " ").trim();

const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(32, 1),
]);

function pedido(id, estado, extra = {}) {
  return {
    id,
    usuario_id: CLIENTE,
    fecha_creacion: new Date(`2026-01-0${id % 9 || 1}T10:00:00Z`),
    estado,
    metodo_pago: "pos",
    total: 100,
    direccion_id: 1,
    direccion_usuario_id: CLIENTE,
    calle: "Rivera",
    numero: "89",
    ciudad: "Salto",
    referencia: null,
    lat: -31.38,
    lng: -57.96,
    repartidor_id: null,
    foto_entrega_url: null,
    ...extra,
  };
}

function initialState() {
  return {
    orders: [
      pedido(1, "preparando"),
      pedido(2, "preparando", { fecha_creacion: new Date("2026-01-01T08:00:00Z") }),
      pedido(3, "realizado"),
      pedido(4, "en_reparto", { repartidor_id: OTRO_REPARTIDOR }),
      pedido(5, "en_reparto", { repartidor_id: PEDRO }),
      pedido(6, "en_reparto", { repartidor_id: PEDRO, metodo_pago: "mercadopago" }),
      pedido(7, "preparando", { repartidor_id: OTRO_REPARTIDOR }),
    ],
    payments: [
      { id: 50, pedido_id: 5, metodo: "pos", estado: "pendiente", fecha_pago: null, registrado_por: null },
      { id: 60, pedido_id: 6, metodo: "mercadopago", estado: "pagado", fecha_pago: new Date(), registrado_por: null },
    ],
    history: [],
  };
}

async function createApp({ estado = initialState() } = {}) {
  process.env.FASTIFY_SECRET = "repartos-test-secret";
  process.env.BUCKET_URL = "http://bucket.test:3001";
  process.env.BUCKET_PUBLIC_URL = "http://localhost:3001";
  process.env.BUCKET_TOKEN = "token-de-prueba";

  const calls = [];
  const subidas = [];
  const buscar = (id) => estado.orders.find((o) => o.id === id);

  async function query(sqlCrudo, values = []) {
    const sql = normalizar(sqlCrudo);
    calls.push({ sql, values });

    if (["BEGIN", "COMMIT", "ROLLBACK"].includes(sql)) return { rows: [] };
    if (sql.includes("FROM pedido_item WHERE pedido_id = $1")) return { rows: [] };

    if (sql.includes("WHERE p.estado = 'preparando' AND p.repartidor_id IS NULL")) {
      const rows = estado.orders
        .filter((o) => o.estado === "preparando" && o.repartidor_id === null)
        .sort((a, b) => a.fecha_creacion - b.fecha_creacion);
      return { rows };
    }
    if (/FROM pedido p WHERE p\.repartidor_id = \$1 ORDER BY/.test(sql)) {
      return { rows: estado.orders.filter((o) => o.repartidor_id === values[0]) };
    }
    if (/FROM pedido p WHERE p\.id = \$1$/.test(sql)) {
      const row = buscar(values[0]);
      return { rows: row ? [row] : [] };
    }
    if (sql.startsWith("SELECT id FROM pedido WHERE repartidor_id = $1 AND estado = 'en_reparto'")) {
      return { rows: estado.orders.filter((o) => o.repartidor_id === values[0] && o.estado === "en_reparto").slice(0, 1) };
    }
    if (/^SELECT id, (usuario_id, )?estado, (metodo_pago, )?repartidor_id FROM pedido WHERE id = \$1( FOR UPDATE)?$/.test(sql)) {
      const row = buscar(values[0]);
      return { rows: row ? [{ ...row }] : [] };
    }
    if (sql === "UPDATE pedido SET estado = 'en_reparto', repartidor_id = $1 WHERE id = $2") {
      Object.assign(buscar(values[1]), { estado: "en_reparto", repartidor_id: values[0] });
      return { rows: [] };
    }
    if (sql.startsWith("UPDATE pedido SET estado = 'entregado', foto_entrega_url = $1")) {
      const row = buscar(values[1]);
      if (!row || row.estado !== "en_reparto" || row.repartidor_id !== values[2]) return { rows: [] };
      Object.assign(row, { estado: "entregado", foto_entrega_url: values[0] });
      return { rows: [{ id: row.id, metodo_pago: row.metodo_pago }] };
    }
    if (sql === "UPDATE pedido SET estado = $1, repartidor_id = NULL WHERE id = $2") {
      Object.assign(buscar(values[1]), { estado: values[0], repartidor_id: null });
      return { rows: [] };
    }
    if (sql === "UPDATE pedido SET estado = $1 WHERE id = $2") {
      buscar(values[1]).estado = values[0];
      return { rows: [] };
    }
    if (sql.startsWith("UPDATE pago SET estado = 'pagado'")) {
      for (const pago of estado.payments) {
        if (pago.pedido_id === values[0] && pago.metodo === "pos" && ["pendiente", "rechazado"].includes(pago.estado)) {
          Object.assign(pago, { estado: "pagado", fecha_pago: new Date(), registrado_por: values[1] });
        }
      }
      return { rows: [] };
    }
    if (sql.startsWith("INSERT INTO pedido_estado_historial")) {
      const estadoNuevo = values.length === 3 ? values[1] : sql.match(/'([a-z_]+)'/)[1];
      estado.history.push({ pedido_id: values[0], estado: estadoNuevo, usuario_id: values.at(-1) });
      return { rows: [] };
    }
    throw new Error(`Consulta inesperada: ${sql}`);
  }

  const pg = {
    query,
    async connect() {
      return { query, release() {} };
    },
  };

  globalThis.fetch = async (url, init) => {
    const archivo = init.body.get("file");
    subidas.push({ url, tipo: archivo.type, token: init.headers["x-bucket-token"] });
    return new Response(JSON.stringify({ filename: "foto-entrega.png" }), {
      status: 201,
      headers: { "content-type": "application/json" },
    });
  };

  const app = Fastify();
  app.decorate("pg", pg);
  app.register(errorHandler);
  app.register(jwtPlugin);
  app.register(orderRoutes, { prefix: "/api" });
  app.register(repartosRoutes, { prefix: "/api" });
  await app.ready();
  apps.push(app);
  return { app, calls, subidas, estado };
}

function headers(app, id, rol) {
  return { authorization: `Bearer ${app.jwt.sign({ id, rol }, { expiresIn: "1h" })}` };
}

function pedir(app, method, url, { id = PEDRO, rol = "repartidor", payload } = {}) {
  return app.inject({ method, url, headers: headers(app, id, rol), payload });
}

function entregar(app, pedidoId, { id = PEDRO, rol = "repartidor", contenido = PNG, tipo = "image/png" } = {}) {
  const boundary = "----limite-entrega";
  const payload = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="entrega.png"\r\n` +
        `Content-Type: ${tipo}\r\n\r\n`,
    ),
    contenido,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  return app.inject({
    method: "POST",
    url: `/api/pedidos/${pedidoId}/entregar`,
    headers: { ...headers(app, id, rol), "content-type": `multipart/form-data; boundary=${boundary}` },
    payload,
  });
}

test("GET /repartos/disponibles es solo para repartidores y lista preparando sin repartidor", async () => {
  const { app } = await createApp();

  assert.equal((await app.inject({ method: "GET", url: "/api/repartos/disponibles" })).statusCode, 401);
  for (const [id, rol] of [[CLIENTE, "cliente"], [CAJERO, "cajero"], [1, "dueno"]]) {
    assert.equal((await pedir(app, "GET", "/api/repartos/disponibles", { id, rol })).statusCode, 403);
  }

  const response = await pedir(app, "GET", "/api/repartos/disponibles");
  assert.equal(response.statusCode, 200);
  //el 2 es mas viejo que el 1; el 7 ya lo tiene otro repartidor
  assert.deepEqual(response.json().map((p) => p.id), [2, 1]);
  assert.equal(response.json()[0].repartidorId, null);
});

test("POST /pedidos/:id/recoger asigna al repartidor, pasa a en_reparto y registra el historial", async () => {
  const estado = initialState();
  estado.orders = estado.orders.filter((o) => o.repartidor_id !== PEDRO);
  const { app } = await createApp({ estado });

  const response = await pedir(app, "POST", "/api/pedidos/1/recoger");

  assert.equal(response.statusCode, 200);
  assert.equal(response.json().estado, "en_reparto");
  assert.equal(response.json().repartidorId, PEDRO);
  assert.deepEqual(estado.history, [{ pedido_id: 1, estado: "en_reparto", usuario_id: PEDRO }]);
});

test("recoger rechaza pedidos no listos, de otro repartidor, inexistentes o con un reparto en curso", async () => {
  const estado = initialState();
  const { app } = await createApp({ estado });

  //Pedro ya tiene el 5 en reparto
  const ocupado = await pedir(app, "POST", "/api/pedidos/1/recoger");
  assert.equal(ocupado.statusCode, 409);
  assert.match(ocupado.json().message, /ya tenés el pedido 5/);

  //un tercer repartidor (30), sin repartos activos: el 3 no esta listo,
  //el 7 ya lo tiene otro y el 999 no existe
  assert.equal((await pedir(app, "POST", "/api/pedidos/3/recoger", { id: 30 })).statusCode, 409);
  assert.equal((await pedir(app, "POST", "/api/pedidos/7/recoger", { id: 30 })).statusCode, 409);
  assert.equal((await pedir(app, "POST", "/api/pedidos/999/recoger", { id: 30 })).statusCode, 404);
  assert.equal((await pedir(app, "POST", "/api/pedidos/1/recoger", { id: CLIENTE, rol: "cliente" })).statusCode, 403);
  assert.equal((await pedir(app, "POST", "/api/pedidos/1/recoger", { id: CAJERO, rol: "cajero" })).statusCode, 403);

  assert.equal(estado.orders.find((o) => o.id === 1).estado, "preparando");
  assert.deepEqual(estado.history, []);
});

test("POST /pedidos/:id/entregar sube la foto, cierra el pedido y registra el pago POS", async () => {
  const estado = initialState();
  const { app, subidas } = await createApp({ estado });

  const response = await entregar(app, 5);

  assert.equal(response.statusCode, 200);
  assert.equal(response.json().estado, "entregado");
  assert.equal(response.json().fotoEntregaUrl, "http://localhost:3001/foto-entrega.png");
  assert.equal(subidas.length, 1);
  assert.equal(subidas[0].token, "token-de-prueba");
  const pago = estado.payments.find((p) => p.pedido_id === 5);
  assert.equal(pago.estado, "pagado");
  assert.equal(pago.registrado_por, PEDRO);
  assert.deepEqual(estado.history, [{ pedido_id: 5, estado: "entregado", usuario_id: PEDRO }]);
});

test("entregar un pedido de MercadoPago no toca el pago", async () => {
  const estado = initialState();
  const { app } = await createApp({ estado });

  const response = await entregar(app, 6);

  assert.equal(response.statusCode, 200);
  assert.equal(estado.payments.find((p) => p.pedido_id === 6).registrado_por, null);
});

test("entregar exige el pedido propio en reparto y una imagen válida, sin subir nada si falla", async () => {
  const estado = initialState();
  const { app, subidas } = await createApp({ estado });

  assert.equal((await entregar(app, 4)).statusCode, 403); //es del otro repartidor
  assert.equal((await entregar(app, 1)).statusCode, 403); //todavia no lo recogio nadie
  assert.equal((await entregar(app, 999)).statusCode, 404);
  assert.equal((await entregar(app, 5, { id: CAJERO, rol: "cajero" })).statusCode, 403);

  estado.orders.find((o) => o.id === 7).repartidor_id = PEDRO;
  assert.equal((await entregar(app, 7)).statusCode, 409); //preparando, no en_reparto

  assert.equal((await entregar(app, 5, { tipo: "image/gif", contenido: Buffer.from("GIF89a") })).statusCode, 400);
  assert.equal((await entregar(app, 5, { contenido: Buffer.from("no soy una imagen") })).statusCode, 400);
  const sinArchivo = await pedir(app, "POST", "/api/pedidos/5/entregar", { payload: {} });
  assert.equal(sinArchivo.statusCode, 400);

  assert.equal(subidas.length, 0);
  assert.equal(estado.orders.find((o) => o.id === 5).estado, "en_reparto");
});

test("el repartidor ve solo sus pedidos y los disponibles", async () => {
  const { app, calls } = await createApp();

  assert.equal((await pedir(app, "GET", "/api/pedidos/5")).statusCode, 200); //suyo
  assert.equal((await pedir(app, "GET", "/api/pedidos/1")).statusCode, 200); //disponible
  assert.equal((await pedir(app, "GET", "/api/pedidos/4")).statusCode, 403); //de otro
  assert.equal((await pedir(app, "GET", "/api/pedidos/3")).statusCode, 403); //todavia realizado
  assert.equal((await pedir(app, "GET", "/api/pedidos/7")).statusCode, 403); //preparando pero de otro

  const lista = await pedir(app, "GET", "/api/pedidos");
  assert.equal(lista.statusCode, 200);
  assert.deepEqual(lista.json().map((p) => p.id).sort(), [5, 6]);
  assert.deepEqual(calls.at(-3).values.slice(0, 1), [PEDRO]);
});

test("el personal no puede sacar a reparto ni entregar a mano, pero puede volver a preparando", async () => {
  const estado = initialState();
  const { app } = await createApp({ estado });
  const cajero = { id: CAJERO, rol: "cajero" };

  const salir = await pedir(app, "PATCH", "/api/pedidos/1/estado", { ...cajero, payload: { estado: "en_reparto" } });
  assert.equal(salir.statusCode, 409);
  const entregarAMano = await pedir(app, "PATCH", "/api/pedidos/5/estado", { ...cajero, payload: { estado: "entregado" } });
  assert.equal(entregarAMano.statusCode, 409);

  const volver = await pedir(app, "PATCH", "/api/pedidos/5/estado", { ...cajero, payload: { estado: "preparando" } });
  assert.equal(volver.statusCode, 200);
  assert.equal(volver.json().estado, "preparando");
  assert.equal(volver.json().repartidorId, null);
});
