import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import Fastify from "fastify";
import errorHandler from "../plugins/errorHandler.js";
import jwtPlugin from "../plugins/jwt.js";
import orderRoutes from "../src/routes/orders.routes.js";
import paymentRoutes from "../src/routes/payments.routes.js";

const apps = [];
const originalFastifySecret = process.env.FASTIFY_SECRET;

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
  if (originalFastifySecret === undefined) delete process.env.FASTIFY_SECRET;
  else process.env.FASTIFY_SECRET = originalFastifySecret;
});

function initialState() {
  return {
    orders: [
      { id: 10, usuario_id: 5, estado: "realizado", metodo_pago: "pos" },
      { id: 11, usuario_id: 6, estado: "realizado", metodo_pago: "pos" },
      { id: 12, usuario_id: 5, estado: "preparando", metodo_pago: "pos" },
      { id: 13, usuario_id: 5, estado: "preparando", metodo_pago: "mercadopago" },
      { id: 14, usuario_id: 5, estado: "cancelado", metodo_pago: "pos" },
      { id: 15, usuario_id: 5, estado: "realizado", metodo_pago: "pos" },
      { id: 16, usuario_id: 5, estado: "preparando", metodo_pago: "mercadopago" },
      { id: 17, usuario_id: 5, estado: "entregado", metodo_pago: "pos" },
    ].map((order) => ({
      ...order,
      fecha_creacion: new Date("2026-01-01T00:00:00Z"),
      total: 250,
      direccion_id: order.id + 100,
      direccion_usuario_id: order.usuario_id,
      calle: "Rivera",
      numero: "10",
      ciudad: "Bella Unión",
      referencia: null,
    })),
    payments: [
      { id: 20, pedido_id: 10, metodo: "pos", estado: "pendiente", referencia_externa: null, fecha_pago: null, registrado_por: null },
      { id: 21, pedido_id: 13, metodo: "mercadopago", estado: "pendiente", referencia_externa: "MP-1", fecha_pago: null, registrado_por: null },
      { id: 22, pedido_id: 15, metodo: "pos", estado: "pagado", referencia_externa: "POS-1", fecha_pago: new Date(), registrado_por: 8 },
      { id: 23, pedido_id: 11, metodo: "pos", estado: "pendiente", referencia_externa: null, fecha_pago: null, registrado_por: null },
      { id: 24, pedido_id: 17, metodo: "pos", estado: "pendiente", referencia_externa: null, fecha_pago: null, registrado_por: null },
    ],
    items: [
      { id: 1, pedido_id: 10, producto_id: 1, nombre_producto: "Yerba", cantidad: 2, precio_unitario: 100 },
      { id: 2, pedido_id: 10, producto_id: 1, nombre_producto: "Yerba", cantidad: 3, precio_unitario: 100 },
      { id: 3, pedido_id: 10, producto_id: 2, nombre_producto: "Azúcar", cantidad: 1, precio_unitario: 50 },
      { id: 4, pedido_id: 11, producto_id: 1, nombre_producto: "Yerba", cantidad: 1, precio_unitario: 100 },
    ],
    products: [{ id: 1, stock: 10 }, { id: 2, stock: 20 }],
    history: [],
  };
}

async function createApp(options = {}) {
  process.env.FASTIFY_SECRET = "orders-payments-test-secret";
  const app = Fastify();
  apps.push(app);
  const calls = [];
  let state = initialState();
  let snapshot;

  app.decorate("pg", {
    async connect() {
      return {
        async query(sql, values = []) {
          const statement = sql.trim();
          calls.push({ sql: statement, values });
          if (statement === "BEGIN") {
            snapshot = structuredClone(state);
            return { rows: [] };
          }
          if (statement === "COMMIT") {
            snapshot = undefined;
            return { rows: [] };
          }
          if (statement === "ROLLBACK") {
            state = snapshot;
            snapshot = undefined;
            return { rows: [] };
          }

          let rows = [];
          if (statement.startsWith("SELECT id, producto_id, nombre_producto")) {
            rows = state.items.filter((item) => item.pedido_id === values[0]);
          } else if (statement.includes("FROM pedido p JOIN direccion d") && statement.includes("WHERE p.id = $1")) {
            rows = state.orders.filter((order) => order.id === values[0]);
          } else if (statement.includes("FROM pedido WHERE id = $1 FOR UPDATE")) {
            rows = state.orders.filter((order) => order.id === values[0]);
          } else if (statement.includes("FROM pago") && statement.includes("pedido_id = $1") && statement.includes("ORDER BY id FOR UPDATE")) {
            rows = state.payments.filter((payment) => payment.pedido_id === values[0]);
          } else if (statement.startsWith("SELECT producto_id, SUM(cantidad)::integer AS cantidad")) {
            const groups = new Map();
            for (const item of state.items.filter((entry) => entry.pedido_id === values[0])) {
              groups.set(item.producto_id, (groups.get(item.producto_id) ?? 0) + item.cantidad);
            }
            rows = [...groups].map(([producto_id, cantidad]) => ({ producto_id, cantidad }));
          } else if (statement.includes("FROM producto") && statement.includes("FOR UPDATE")) {
            rows = state.products.filter((product) => values[0].includes(product.id));
          } else if (statement.startsWith("UPDATE producto SET stock = stock + $1")) {
            const product = state.products.find((entry) => entry.id === values[1]);
            if (product) {
              product.stock += values[0];
              rows = [{ id: product.id }];
            }
          } else if (statement.startsWith("UPDATE pedido SET estado = 'cancelado'")) {
            const order = state.orders.find((entry) => entry.id === values[0] && entry.estado === values[1]);
            if (order) {
              order.estado = "cancelado";
              rows = [{ id: order.id }];
            }
          } else if (statement.startsWith("UPDATE pedido SET estado = $1")) {
            const order = state.orders.find((entry) => entry.id === values[1]);
            if (order) order.estado = values[0];
          } else if (statement.includes("INSERT INTO pedido_estado_historial")) {
            state.history.push({ pedido_id: values[0], estado: statement.includes("'cancelado'") ? "cancelado" : values[1], usuario_id: values.at(-1) });
          } else if (statement === "SELECT pedido_id FROM pago WHERE id = $1") {
            rows = state.payments.filter((payment) => payment.id === values[0]).map(({ pedido_id }) => ({ pedido_id }));
          } else if (statement === "SELECT id, metodo_pago FROM pedido WHERE id = $1 FOR UPDATE") {
            rows = state.orders.filter((order) => order.id === values[0]);
          } else if (statement.startsWith("SELECT id, pedido_id, metodo, estado, referencia_externa")) {
            rows = state.payments.filter((payment) => payment.id === values[0]);
          } else if (statement.startsWith("UPDATE pago SET estado = 'pagado'")) {
            const payment = state.payments.find((entry) => entry.id === values[2] && ["pendiente", "rechazado"].includes(entry.estado));
            if (payment) {
              payment.estado = "pagado";
              payment.fecha_pago = new Date("2026-10-20T00:00:00Z");
              payment.referencia_externa = values[0];
              payment.registrado_por = values[1];
              rows = [payment];
            }
          } else if (statement.includes("FROM pago JOIN pedido")) {
            rows = state.payments
              .filter((payment) => payment.id === values[0])
              .map((payment) => ({
                ...payment,
                pedido_usuario_id: state.orders.find((order) => order.id === payment.pedido_id)?.usuario_id,
              }));
          } else {
            throw new Error(`Consulta inesperada: ${statement}`);
          }
          if (options.failOn && statement.includes(options.failOn)) throw new Error("fallo simulado");
          return { rows, rowCount: rows.length };
        },
        release() {},
      };
    },
  });
  app.register(errorHandler);
  app.register(jwtPlugin);
  app.register(orderRoutes, { prefix: "/api" });
  app.register(paymentRoutes, { prefix: "/api" });
  await app.ready();
  if (originalFastifySecret === undefined) delete process.env.FASTIFY_SECRET;
  else process.env.FASTIFY_SECRET = originalFastifySecret;
  return { app, calls, getState: () => state };
}

function request(app, rol, userId, method, url, payload) {
  const token = app.jwt.sign({ id: userId, rol }, { expiresIn: "1h" });
  return app.inject({ method, url, payload, headers: { authorization: `Bearer ${token}` } });
}

test("DELETE cancela solo pedido propio, repone cantidades agrupadas una vez y registra historial", async () => {
  const { app, calls, getState } = await createApp();
  const response = await request(app, "cliente", 5, "DELETE", "/api/pedidos/10");
  assert.equal(response.statusCode, 204, `${response.body} ${JSON.stringify(calls.map(({ sql }) => sql))}`);
  assert.equal(getState().orders.find((order) => order.id === 10).estado, "cancelado");
  assert.deepEqual(getState().products, [{ id: 1, stock: 15 }, { id: 2, stock: 21 }]);
  assert.deepEqual(getState().history, [{ pedido_id: 10, estado: "cancelado", usuario_id: 5 }]);
  assert.deepEqual(calls.find(({ sql }) => sql.includes("FROM pedido WHERE id = $1 FOR UPDATE")).values, [10]);

  const repeated = await request(app, "cliente", 5, "DELETE", "/api/pedidos/10");
  assert.equal(repeated.statusCode, 409);
  assert.deepEqual(getState().products, [{ id: 1, stock: 15 }, { id: 2, stock: 21 }]);
  assert.equal(getState().history.length, 1);
});

test("DELETE rechaza pedido ajeno, inexistente, ya cancelado, pagado o con pago MercadoPago desconocido", async () => {
  const { app, getState } = await createApp();
  assert.equal((await request(app, "cliente", 5, "DELETE", "/api/pedidos/11")).statusCode, 403);
  assert.equal((await request(app, "cliente", 5, "DELETE", "/api/pedidos/99")).statusCode, 404);
  const alreadyCancelled = await request(app, "cliente", 5, "DELETE", "/api/pedidos/14");
  assert.equal(alreadyCancelled.statusCode, 409, alreadyCancelled.body);
  assert.equal((await request(app, "cliente", 5, "DELETE", "/api/pedidos/15")).statusCode, 409);
  assert.equal((await request(app, "cliente", 5, "DELETE", "/api/pedidos/13")).statusCode, 409);
  assert.equal((await request(app, "cliente", 5, "DELETE", "/api/pedidos/16")).statusCode, 409);
  assert.deepEqual(getState().products, [{ id: 1, stock: 10 }, { id: 2, stock: 20 }]);
  assert.equal(getState().history.length, 0);
});

test("DELETE hace rollback total ante un fallo al reponer stock", async () => {
  const { app, calls, getState } = await createApp({ failOn: "UPDATE producto SET stock = stock + $1" });
  const before = structuredClone(getState());
  const response = await request(app, "cliente", 5, "DELETE", "/api/pedidos/10");
  assert.equal(response.statusCode, 500);
  assert.deepEqual(getState(), before);
  assert.equal(calls.at(-1).sql, "ROLLBACK");
});

test("PATCH de estado exige rol permitido y aplica transiciones adyacentes", async () => {
  const { app, getState } = await createApp();
  assert.equal((await app.inject({ method: "PATCH", url: "/api/pedidos/10/estado", payload: { estado: "preparando" } })).statusCode, 401);
  assert.equal((await request(app, "cliente", 5, "PATCH", "/api/pedidos/10/estado", { estado: "preparando" })).statusCode, 403);
  const updated = await request(app, "cajero", 8, "PATCH", "/api/pedidos/10/estado", { estado: "preparando" });
  assert.equal(updated.statusCode, 200);
  assert.equal(updated.json().estado, "preparando");
  assert.equal(getState().history[0].usuario_id, 8);
  assert.equal((await request(app, "dueno", 9, "PATCH", "/api/pedidos/10/estado", { estado: "entregado" })).statusCode, 409);
});

test("GET pago limita clientes por propietario del pedido y permite personal autorizado", async () => {
  const { app, calls } = await createApp();
  const invalidToken = await app.inject({ method: "GET", url: "/api/pagos/20", headers: { authorization: "Bearer invalid" } });
  assert.equal(invalidToken.statusCode, 401);
  const own = await request(app, "cliente", 5, "GET", "/api/pagos/20");
  assert.equal(own.statusCode, 200);
  assert.equal(own.json().pedidoId, 10);
  assert.deepEqual(calls[0].values, [20]);
  assert.equal((await request(app, "cliente", 5, "GET", "/api/pagos/23")).statusCode, 403);
  assert.equal((await request(app, "cliente", 5, "GET", "/api/pagos/99")).statusCode, 404);
  assert.equal((await request(app, "cajero", 8, "GET", "/api/pagos/22")).statusCode, 200);
  assert.equal((await request(app, "dueno", 9, "GET", "/api/pagos/22")).statusCode, 200);
});

test("PATCH POS solo permite cajero/dueño y registra el actor JWT, nunca el actor enviado en body", async () => {
  const { app, getState, calls } = await createApp();
  assert.equal((await app.inject({ method: "PATCH", url: "/api/pagos/20/pos", payload: {} })).statusCode, 401);
  assert.equal((await request(app, "cliente", 5, "PATCH", "/api/pagos/20/pos", {})).statusCode, 403);
  const response = await request(app, "cajero", 8, "PATCH", "/api/pagos/24/pos", {
    referenciaExterna: "POS-20", registradoPor: 99,
  });
  assert.equal(response.statusCode, 200);
  assert.equal(response.json().estado, "pagado");
  assert.equal(response.json().registradoPor, 8);
  assert.deepEqual(calls.find(({ sql }) => sql.startsWith("UPDATE pago SET estado = 'pagado'")).values, ["POS-20", 8, 24]);
  assert.equal((await request(app, "dueno", 9, "PATCH", "/api/pagos/24/pos", {})).statusCode, 409);
  assert.equal((await request(app, "cajero", 8, "PATCH", "/api/pagos/20/pos", {})).statusCode, 409);
  assert.equal(getState().payments.find((payment) => payment.id === 24).registrado_por, 8);
});
