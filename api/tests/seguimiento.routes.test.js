import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import Fastify from "fastify";
import errorHandler from "../plugins/errorHandler.js";
import jwtPlugin from "../plugins/jwt.js";
import seguimientoPlugin, { avisarEstado } from "../plugins/seguimiento.js";
import seguimientoRoutes from "../src/routes/seguimiento.routes.js";

const apps = [];
const sockets = [];
const envOriginal = {
  FASTIFY_SECRET: process.env.FASTIFY_SECRET,
  LOCAL_LAT: process.env.LOCAL_LAT,
  LOCAL_LNG: process.env.LOCAL_LNG,
};

afterEach(async () => {
  for (const ws of sockets.splice(0)) ws.terminate();
  await Promise.all(apps.splice(0).map((app) => app.close()));
  for (const [clave, valor] of Object.entries(envOriginal)) {
    if (valor === undefined) delete process.env[clave];
    else process.env[clave] = valor;
  }
});

//ids: 3 y 4 clientes, 8 cajero, 20 y 21 repartidores
const JUAN = 3;
const ANA = 4;
const PEDRO = 20;
const OTRO = 21;

const normalizar = (sql) => sql.replace(/\s+/g, " ").trim();

async function createApp() {
  process.env.FASTIFY_SECRET = "seguimiento-test-secret";
  process.env.LOCAL_LAT = "-31.38876";
  process.env.LOCAL_LNG = "-57.96062";

  const pedidos = new Map([
    [5, { id: 5, usuario_id: JUAN, estado: "en_reparto", repartidor_id: PEDRO, direccion_lat: -31.3801, direccion_lng: -57.9655, foto_entrega_url: null }],
    [6, { id: 6, usuario_id: JUAN, estado: "entregado", repartidor_id: PEDRO, direccion_lat: -31.3853, direccion_lng: -57.9552, foto_entrega_url: "http://localhost:3001/f.png" }],
  ]);
  const ubicaciones = [
    { pedido_id: 6, lat: -31.385, lng: -57.958, fecha: new Date("2026-01-01T10:05:00Z") },
    { pedido_id: 6, lat: -31.388, lng: -57.960, fecha: new Date("2026-01-01T10:00:00Z") },
  ];
  const calls = [];

  const pg = {
    async query(sqlCrudo, values) {
      const sql = normalizar(sqlCrudo);
      calls.push({ sql, values });
      if (sql.startsWith("SELECT id, usuario_id, estado, repartidor_id, direccion_lat")) {
        const row = pedidos.get(values[0]);
        return { rows: row ? [row] : [] };
      }
      if (sql.startsWith("INSERT INTO pedido_ubicacion")) {
        assert.match(sql, /WHERE EXISTS \( SELECT 1 FROM pedido WHERE id = \$1 AND estado = 'en_reparto' AND repartidor_id = \$4 \)/);
        const [pedido_id, lat, lng, repartidor] = values;
        const pedido = pedidos.get(pedido_id);
        if (!pedido || pedido.estado !== "en_reparto" || pedido.repartidor_id !== repartidor) return { rows: [] };
        const fecha = new Date("2026-01-01T12:00:00Z");
        ubicaciones.push({ pedido_id, lat, lng, fecha });
        return { rows: [{ fecha }] };
      }
      if (sql.startsWith("SELECT lat, lng, fecha FROM pedido_ubicacion")) {
        assert.match(sql, /ORDER BY fecha, id$/);
        const rows = ubicaciones
          .filter((u) => u.pedido_id === values[0])
          .sort((a, b) => a.fecha - b.fecha);
        return { rows };
      }
      throw new Error(`Consulta inesperada: ${sql}`);
    },
  };

  const app = Fastify();
  app.decorate("pg", pg);
  app.register(errorHandler);
  app.register(jwtPlugin);
  app.register(seguimientoPlugin);
  app.register(seguimientoRoutes, { prefix: "/api" });
  await app.ready();
  apps.push(app);
  return { app, calls, ubicaciones, pedidos };
}

function token(app, id, rol) {
  return app.jwt.sign({ id, rol }, { expiresIn: "1h" });
}

//abre el websocket y junta los mensajes y el cierre en una cola
async function conectar(app, pedidoId) {
  const ws = await app.injectWS(`/api/pedidos/${pedidoId}/seguimiento`);
  sockets.push(ws);
  const cola = [];
  const esperando = [];
  const entregar = (evento) => {
    const siguiente = esperando.shift();
    if (siguiente) siguiente(evento);
    else cola.push(evento);
  };
  ws.on("message", (data) => entregar({ mensaje: JSON.parse(data.toString()) }));
  ws.on("close", (codigo) => entregar({ cierre: codigo }));
  ws.siguiente = (ms = 1000) =>
    cola.length
      ? Promise.resolve(cola.shift())
      : new Promise((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error("no llegó ningún mensaje")), ms);
          esperando.push((evento) => {
            clearTimeout(timer);
            resolve(evento);
          });
        });
  ws.mandar = (mensaje) => ws.send(JSON.stringify(mensaje));
  return ws;
}

async function conectarComo(app, pedidoId, id, rol) {
  const ws = await conectar(app, pedidoId);
  ws.mandar({ tipo: "auth", token: token(app, id, rol) });
  return ws;
}

async function esperarCierre(ws) {
  for (;;) {
    const evento = await ws.siguiente();
    if ("cierre" in evento) return evento.cierre;
  }
}

test("el cliente del pedido y su repartidor entran a la sala", async () => {
  const { app } = await createApp();

  const juan = await conectarComo(app, 5, JUAN, "cliente");
  assert.deepEqual((await juan.siguiente()).mensaje, { tipo: "listo", pedidoId: 5, estado: "en_reparto", rol: "cliente" });

  const pedro = await conectarComo(app, 5, PEDRO, "repartidor");
  assert.deepEqual((await pedro.siguiente()).mensaje, { tipo: "listo", pedidoId: 5, estado: "en_reparto", rol: "repartidor" });
  assert.equal(app.seguimiento.conectados(5), 2);
});

test("sin login válido, sin permiso o con un pedido inexistente se cierra la conexión", async () => {
  const { app } = await createApp();

  const sinAuth = await conectar(app, 5);
  sinAuth.mandar({ tipo: "ubicacion", lat: 1, lng: 1 });
  assert.equal(await esperarCierre(sinAuth), 4401);

  const tokenTrucho = await conectar(app, 5);
  tokenTrucho.mandar({ tipo: "auth", token: "no-es-un-jwt" });
  assert.equal(await esperarCierre(tokenTrucho), 4401);

  for (const [id, rol] of [[ANA, "cliente"], [OTRO, "repartidor"], [8, "cajero"], [1, "dueno"]]) {
    const ws = await conectarComo(app, 5, id, rol);
    assert.equal(await esperarCierre(ws), 4403, `${rol} ${id}`);
  }

  const inexistente = await conectarComo(app, 999, JUAN, "cliente");
  assert.equal(await esperarCierre(inexistente), 4404);
  assert.equal(app.seguimiento.conectados(5), 0);
});

test("la ubicación del repartidor se guarda y le llega en vivo al cliente", async () => {
  const { app, ubicaciones } = await createApp();
  const juan = await conectarComo(app, 5, JUAN, "cliente");
  await juan.siguiente();
  const pedro = await conectarComo(app, 5, PEDRO, "repartidor");
  await pedro.siguiente();

  pedro.mandar({ tipo: "ubicacion", lat: -31.384, lng: -57.962 });
  const esperado = { tipo: "ubicacion", pedidoId: 5, lat: -31.384, lng: -57.962, fecha: "2026-01-01T12:00:00.000Z" };
  assert.deepEqual((await juan.siguiente()).mensaje, esperado);
  assert.deepEqual((await pedro.siguiente()).mensaje, esperado);
  assert.equal(ubicaciones.filter((u) => u.pedido_id === 5).length, 1);

  //un segundo punto enseguida se ignora (el celular manda cada ~5 s)
  pedro.mandar({ tipo: "ubicacion", lat: -31.383, lng: -57.963 });
  await assert.rejects(juan.siguiente(300));
  assert.equal(ubicaciones.filter((u) => u.pedido_id === 5).length, 1);
});

test("ubicaciones inválidas, del cliente o de un pedido que ya no está en reparto se rechazan", async () => {
  const { app, ubicaciones, pedidos } = await createApp();
  const juan = await conectarComo(app, 5, JUAN, "cliente");
  await juan.siguiente();
  juan.mandar({ tipo: "ubicacion", lat: -31.38, lng: -57.96 });
  assert.match((await juan.siguiente()).mensaje.mensaje, /solo el repartidor/);

  const pedro = await conectarComo(app, 5, PEDRO, "repartidor");
  await pedro.siguiente();
  pedro.mandar({ tipo: "ubicacion", lat: 95, lng: -57.96 });
  assert.match((await pedro.siguiente()).mensaje.mensaje, /números válidos/);
  pedro.mandar({ tipo: "ubicacion", lat: "-31.38", lng: -57.96 });
  assert.match((await pedro.siguiente()).mensaje.mensaje, /números válidos/);
  pedro.send("esto no es json");
  assert.match((await pedro.siguiente()).mensaje.mensaje, /JSON/);
  pedro.mandar({ tipo: "otra-cosa" });
  assert.match((await pedro.siguiente()).mensaje.mensaje, /desconocido/);

  //el pedido se entrega mientras el repartidor sigue conectado
  pedidos.get(5).estado = "entregado";
  pedro.mandar({ tipo: "ubicacion", lat: -31.38, lng: -57.96 });
  assert.match((await pedro.siguiente()).mensaje.mensaje, /ya no está en reparto/);
  assert.equal(ubicaciones.filter((u) => u.pedido_id === 5).length, 0);
});

test("los cambios de estado les llegan a todos los que miran el pedido", async () => {
  const { app } = await createApp();
  const juan = await conectarComo(app, 5, JUAN, "cliente");
  await juan.siguiente();

  avisarEstado(app, { id: 5, estado: "entregado", repartidorId: PEDRO, fotoEntregaUrl: "http://localhost:3001/x.png" });

  assert.deepEqual((await juan.siguiente()).mensaje, {
    tipo: "estado",
    pedidoId: 5,
    estado: "entregado",
    repartidorId: PEDRO,
    fotoEntregaUrl: "http://localhost:3001/x.png",
  });
});

test("GET /pedidos/:id/recorrido devuelve origen, destino y puntos solo al cliente y su repartidor", async () => {
  const { app } = await createApp();
  const pedir = (id, rol, pedidoId = 6) =>
    app.inject({
      method: "GET",
      url: `/api/pedidos/${pedidoId}/recorrido`,
      headers: rol ? { authorization: `Bearer ${token(app, id, rol)}` } : {},
    });

  const juan = await pedir(JUAN, "cliente");
  assert.equal(juan.statusCode, 200);
  assert.deepEqual(juan.json(), {
    pedidoId: 6,
    estado: "entregado",
    origen: { lat: -31.38876, lng: -57.96062 },
    destino: { lat: -31.3853, lng: -57.9552 },
    puntos: [
      { lat: -31.388, lng: -57.96, fecha: "2026-01-01T10:00:00.000Z" },
      { lat: -31.385, lng: -57.958, fecha: "2026-01-01T10:05:00.000Z" },
    ],
  });
  assert.equal((await pedir(PEDRO, "repartidor")).statusCode, 200);

  assert.equal((await pedir(null, null)).statusCode, 401);
  assert.equal((await pedir(ANA, "cliente")).statusCode, 403);
  assert.equal((await pedir(OTRO, "repartidor")).statusCode, 403);
  assert.equal((await pedir(8, "cajero")).statusCode, 403);
  assert.equal((await pedir(1, "dueno")).statusCode, 403);
  assert.equal((await pedir(JUAN, "cliente", 999)).statusCode, 404);
});
