import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import Fastify from "fastify";
import stockPlugin, { avisarStock, avisarStockDePedido } from "../plugins/stock.js";
import stockRoutes from "../src/routes/stock.routes.js";

const apps = [];
const sockets = [];

afterEach(async () => {
  for (const ws of sockets.splice(0)) ws.terminate();
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

const normalizar = (sql) => sql.replace(/\s+/g, " ").trim();

async function createApp({ falla = false } = {}) {
  //stock "real" de la base despues de que corrieron los triggers
  const productos = new Map([
    [1, 10],
    [2, 0],
    [3, 7],
  ]);
  const itemsPorPedido = new Map([[50, [1, 2, 1]]]);
  const calls = [];

  const pg = {
    async query(sqlCrudo, values) {
      const sql = normalizar(sqlCrudo);
      calls.push({ sql, values });
      if (falla) throw new Error("la base no responde");
      if (sql.startsWith("SELECT id, stock FROM producto WHERE id = ANY($1::int[])")) {
        const rows = values[0]
          .filter((id) => productos.has(id))
          .sort((a, b) => a - b)
          .map((id) => ({ id, stock: productos.get(id) }));
        return { rows };
      }
      if (sql.startsWith("SELECT DISTINCT producto_id FROM pedido_item WHERE pedido_id = $1")) {
        const ids = [...new Set(itemsPorPedido.get(values[0]) ?? [])];
        return { rows: ids.map((producto_id) => ({ producto_id })) };
      }
      throw new Error(`Consulta inesperada: ${sql}`);
    },
  };

  const app = Fastify();
  app.decorate("pg", pg);
  app.register(stockPlugin);
  app.register(stockRoutes, { prefix: "/api" });
  await app.ready();
  apps.push(app);
  return { app, calls, productos };
}

//abre el websocket y junta los mensajes en una cola. el listener se engancha en onInit
//porque el servidor manda "listo" apenas se conecta, antes de que injectWS resuelva
async function conectar(app) {
  const cola = [];
  const esperando = [];
  const recibir = (data) => {
    const mensaje = JSON.parse(data.toString());
    const siguiente = esperando.shift();
    if (siguiente) siguiente(mensaje);
    else cola.push(mensaje);
  };
  const ws = await app.injectWS("/api/productos/stock", {}, {
    onInit: (socket) => socket.on("message", recibir),
  });
  sockets.push(ws);
  ws.siguiente = (ms = 1000) =>
    cola.length
      ? Promise.resolve(cola.shift())
      : new Promise((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error("no llegó ningún mensaje")), ms);
          esperando.push((mensaje) => {
            clearTimeout(timer);
            resolve(mensaje);
          });
        });
  ws.nadaPor = async (ms = 150) => {
    await new Promise((resolve) => setTimeout(resolve, ms));
    assert.equal(cola.length, 0, `llegó un mensaje inesperado: ${JSON.stringify(cola[0])}`);
  };
  return ws;
}

test("al conectarse llega listo, sin pedir login", async () => {
  const { app } = await createApp();
  const ws = await conectar(app);

  assert.deepEqual(await ws.siguiente(), { tipo: "listo" });
  assert.equal(app.stock.conectados(), 1);
});

test("avisarStock manda el stock leido de la base a todos los conectados", async () => {
  const { app, productos } = await createApp();
  const ana = await conectar(app);
  const juan = await conectar(app);
  await ana.siguiente();
  await juan.siguiente();

  productos.set(3, 4); //por ejemplo, el dueño cargo stock a mano
  await avisarStock(app, [3, 3, 99]);

  const esperado = { tipo: "stock", productos: [{ id: 3, stock: 4 }] };
  assert.deepEqual(await ana.siguiente(), esperado);
  assert.deepEqual(await juan.siguiente(), esperado);
});

test("avisarStockDePedido avisa una vez por producto del pedido", async () => {
  const { app } = await createApp();
  const ws = await conectar(app);
  await ws.siguiente();

  await avisarStockDePedido(app, 50);

  assert.deepEqual(await ws.siguiente(), {
    tipo: "stock",
    productos: [
      { id: 1, stock: 10 },
      { id: 2, stock: 0 },
    ],
  });
  await ws.nadaPor();
});

test("sin nadie conectado no consulta la base", async () => {
  const { app, calls } = await createApp();

  await avisarStock(app, [1]);
  await avisarStockDePedido(app, 50);

  assert.equal(calls.length, 0);
});

test("lo que manda el cliente se ignora y al cerrar sale del hub", async () => {
  const { app } = await createApp();
  const ws = await conectar(app);
  await ws.siguiente();

  ws.send(JSON.stringify({ tipo: "stock", productos: [{ id: 1, stock: 999 }] }));
  await ws.nadaPor();

  ws.terminate();
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.equal(app.stock.conectados(), 0);
});

test("si la base falla no tira error: el pedido ya quedo guardado", async () => {
  const { app } = await createApp({ falla: true });
  const ws = await conectar(app);
  await ws.siguiente();

  await assert.doesNotReject(() => avisarStock(app, [1]));
  await assert.doesNotReject(() => avisarStockDePedido(app, 50));
  await ws.nadaPor();
});
