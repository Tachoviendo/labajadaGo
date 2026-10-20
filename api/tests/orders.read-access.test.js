import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import Fastify from "fastify";
import errorHandler from "../plugins/errorHandler.js";
import jwtPlugin from "../plugins/jwt.js";
import orderRoutes from "../src/routes/orders.routes.js";

const apps = [];
const originalFastifySecret = process.env.FASTIFY_SECRET;

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
  if (originalFastifySecret === undefined) delete process.env.FASTIFY_SECRET;
  else process.env.FASTIFY_SECRET = originalFastifySecret;
});

const orders = [1, 2].map((id) => ({
  id,
  usuario_id: id,
  fecha_creacion: new Date(`2026-01-0${id}T00:00:00.000Z`),
  estado: "realizado",
  metodo_pago: "pos",
  total: 100,
  direccion_id: id + 10,
  direccion_usuario_id: id,
  calle: `Calle ${id}`,
  numero: null,
  ciudad: "Bella Unión",
  referencia: null,
}));

async function createApp() {
  process.env.FASTIFY_SECRET = "orders-read-test-secret";
  const app = Fastify();
  const calls = [];
  app.decorate("pg", {
    async connect() {
      return {
        async query(sql, values = []) {
          const statement = sql.trim();
          calls.push({ sql: statement, values });
          if (statement.includes("FROM pedido_item WHERE pedido_id = $1")) {
            return { rows: [{
              id: 50 + values[0], producto_id: 7, nombre_producto: "Yerba",
              cantidad: 2, precio_unitario: 50,
            }] };
          }
          if (statement.includes("FROM pedido p JOIN direccion d")) {
            if (statement.includes("WHERE p.id = $1")) {
              return { rows: orders.filter((order) => order.id === values[0]) };
            }
            let result = [...orders];
            if (statement.includes("p.usuario_id = $1")) {
              result = result.filter((order) => order.usuario_id === values[0]);
            }
            return { rows: result.slice(0, values.at(-2)).slice(values.at(-1)) };
          }
          throw new Error(`Consulta inesperada: ${statement}`);
        },
        release() {},
      };
    },
  });
  app.register(errorHandler);
  app.register(jwtPlugin);
  app.register(orderRoutes, { prefix: "/api" });
  await app.ready();
  if (originalFastifySecret === undefined) delete process.env.FASTIFY_SECRET;
  else process.env.FASTIFY_SECRET = originalFastifySecret;
  apps.push(app);
  return { app, calls };
}

function request(app, rol, userId, method, url) {
  const token = app.jwt.sign({ id: userId, rol }, { expiresIn: "1h" });
  return app.inject({ method, url, headers: { authorization: `Bearer ${token}` } });
}

test("GET /pedidos/:id permite el pedido propio, niega el ajeno y devuelve 404 si no existe", async () => {
  const { app, calls } = await createApp();
  const unauthenticated = await app.inject({ method: "GET", url: "/api/pedidos/1" });
  assert.equal(unauthenticated.statusCode, 401);
  const own = await request(app, "cliente", 1, "GET", "/api/pedidos/1");
  assert.equal(own.statusCode, 200);
  assert.equal(own.json().usuarioId, 1);
  assert.equal(own.json().items[0].nombreProducto, "Yerba");
  assert.deepEqual(calls[0].values, [1]);

  const foreign = await request(app, "cliente", 1, "GET", "/api/pedidos/2");
  assert.equal(foreign.statusCode, 403);
  assert.equal(calls.filter(({ sql }) => sql.includes("FROM pedido_item")).length, 1);

  const missing = await request(app, "cliente", 1, "GET", "/api/pedidos/99");
  assert.equal(missing.statusCode, 404);
});

test("GET /pedidos limita clientes al usuario del token y permite el listado administrativo", async () => {
  const { app, calls } = await createApp();
  const unauthenticated = await app.inject({ method: "GET", url: "/api/pedidos" });
  assert.equal(unauthenticated.statusCode, 401);
  const clientList = await request(app, "cliente", 1, "GET", "/api/pedidos?usuarioId=2");
  assert.equal(clientList.statusCode, 200);
  assert.deepEqual(clientList.json().map((order) => order.usuarioId), [1]);
  const clientQuery = calls.find(({ sql }) => sql.includes("FROM pedido p JOIN direccion d"));
  assert.match(clientQuery.sql, /WHERE p\.usuario_id = \$1/);
  assert.equal(clientQuery.values[0], 1);

  for (const rol of ["cajero", "dueno"]) {
    const response = await request(app, rol, 99, "GET", "/api/pedidos");
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json().map((order) => order.usuarioId), [1, 2]);
  }
});

test("cajero y dueño pueden ver pedidos ajenos por ID", async () => {
  const { app } = await createApp();
  for (const rol of ["cajero", "dueno"]) {
    const response = await request(app, rol, 99, "GET", "/api/pedidos/2");
    assert.equal(response.statusCode, 200);
    assert.equal(response.json().usuarioId, 2);
  }
});
