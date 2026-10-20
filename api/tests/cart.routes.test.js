import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import Fastify from "fastify";
import errorHandler from "../plugins/errorHandler.js";
import jwtPlugin from "../plugins/jwt.js";
import cartRoutes from "../src/routes/cart.routes.js";

const apps = [];
const originalFastifySecret = process.env.FASTIFY_SECRET;

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
  if (originalFastifySecret === undefined) delete process.env.FASTIFY_SECRET;
  else process.env.FASTIFY_SECRET = originalFastifySecret;
});

function initialState() {
  return {
    carts: [
      { id: 11, usuario_id: 1, fecha_actualizacion: new Date("2026-01-01T00:00:00Z") },
      { id: 22, usuario_id: 2, fecha_actualizacion: new Date("2026-01-02T00:00:00Z") },
    ],
    items: [
      { id: 31, carrito_id: 11, producto_id: 1, cantidad: 7 },
      { id: 32, carrito_id: 22, producto_id: 1, cantidad: 2 },
    ],
    products: [
      { id: 1, nombre: "Agua", descripcion: null, precio: 30, categoria: "Bebidas", imagen_url: null, stock: 10, activo: true },
      { id: 2, nombre: "Galletas", descripcion: "Dulces", precio: 45, categoria: null, imagen_url: null, stock: 0, activo: true },
      { id: 3, nombre: "Baja", descripcion: null, precio: 20, categoria: "Snacks", imagen_url: null, stock: 5, activo: false },
    ],
  };
}

async function createApp(options = {}) {
  process.env.FASTIFY_SECRET = "cart-routes-test-secret";
  const app = Fastify();
  apps.push(app);
  const calls = [];
  let state = initialState();
  let snapshot;
  let nextCartId = 23;
  let nextItemId = 33;

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
          let rowCount;
          if (statement.startsWith("INSERT INTO carrito (usuario_id)")) {
            if (!state.carts.some((cart) => cart.usuario_id === values[0])) {
              state.carts.push({ id: nextCartId++, usuario_id: values[0], fecha_actualizacion: new Date() });
            }
          } else if (statement.includes("FROM carrito") && statement.includes("WHERE usuario_id = $1 FOR UPDATE")) {
            rows = state.carts.filter((cart) => cart.usuario_id === values[0]);
          } else if (statement.includes("FROM producto WHERE id = $1 FOR UPDATE")) {
            rows = state.products
              .filter((product) => product.id === values[0])
              .map((product) => ({ ...product, producto_id: product.id }));
          } else if (statement.startsWith("SELECT id, cantidad FROM carrito_item")) {
            rows = state.items
              .filter((item) => item.carrito_id === values[0] && item.producto_id === values[1])
              .sort((a, b) => a.id - b.id);
          } else if (statement.startsWith("SELECT MIN(ci.id)")) {
            const cartId = values[0];
            const productId = values[1];
            const grouped = new Map();
            for (const item of state.items) {
              if (item.carrito_id !== cartId || (productId !== undefined && item.producto_id !== productId)) continue;
              const product = state.products.find((entry) => entry.id === item.producto_id);
              if (!product) continue;
              const current = grouped.get(product.id);
              if (current) current.cantidad += item.cantidad;
              else grouped.set(product.id, {
                id: item.id,
                producto_id: product.id,
                nombre: product.nombre,
                descripcion: product.descripcion,
                precio: product.precio,
                categoria: product.categoria,
                imagen_url: product.imagen_url,
                stock: product.stock,
                activo: product.activo,
                cantidad: item.cantidad,
              });
            }
            rows = [...grouped.values()].sort((a, b) => a.producto_id - b.producto_id);
          } else if (statement.startsWith("UPDATE carrito_item SET cantidad")) {
            const item = state.items.find((entry) => entry.id === values[1] && entry.carrito_id === values[2]);
            if (item) item.cantidad = values[0];
          } else if (statement.startsWith("DELETE FROM carrito_item") && statement.includes("id <> $3")) {
            state.items = state.items.filter((item) => !(item.carrito_id === values[0] && item.producto_id === values[1] && item.id !== values[2]));
          } else if (statement.startsWith("INSERT INTO carrito_item")) {
            const item = { id: nextItemId++, carrito_id: values[0], producto_id: values[1], cantidad: values[2] };
            state.items.push(item);
            rows = [{ id: item.id }];
          } else if (statement.startsWith("DELETE FROM carrito_item")) {
            const before = state.items.length;
            state.items = state.items.filter((item) => !(item.carrito_id === values[0] && item.producto_id === values[1]));
            rowCount = before - state.items.length;
          } else if (statement.startsWith("UPDATE carrito SET fecha_actualizacion")) {
            const cart = state.carts.find((entry) => entry.id === values[0]);
            if (cart) cart.fecha_actualizacion = new Date();
          } else {
            throw new Error(`Consulta inesperada: ${statement}`);
          }

          if (options.failOn && statement.includes(options.failOn)) {
            throw new Error("fallo de base simulado");
          }
          return { rows, rowCount };
        },
        release() {},
      };
    },
  });
  app.register(errorHandler);
  app.register(jwtPlugin);
  app.register(cartRoutes, { prefix: "/api" });
  await app.ready();
  if (originalFastifySecret === undefined) delete process.env.FASTIFY_SECRET;
  else process.env.FASTIFY_SECRET = originalFastifySecret;
  return { app, calls, getState: () => state };
}

function request(app, userId, method, url, payload) {
  const token = app.jwt.sign({ id: userId, rol: "cliente" }, { expiresIn: "1h" });
  return app.inject({ method, url, payload, headers: { authorization: `Bearer ${token}` } });
}

test("GET /carrito devuelve solamente el carrito del usuario autenticado", async () => {
  const { app, calls } = await createApp();
  const response = await request(app, 2, "GET", "/api/carrito");
  assert.equal(response.statusCode, 200);
  assert.equal(response.json().id, 22);
  assert.equal(response.json().usuarioId, 2);
  assert.deepEqual(response.json().items.map((item) => [item.producto.id, item.cantidad]), [[1, 2]]);
  assert.equal(response.json().total, 60);
  assert.deepEqual(calls.find(({ sql }) => sql.includes("WHERE usuario_id = $1 FOR UPDATE")).values, [2]);
});

test("POST agrega y suma el item del carrito del token, validando stock y parámetros", async () => {
  const { app, calls, getState } = await createApp();
  const response = await request(app, 2, "POST", "/api/carrito/items", { productoId: 1, cantidad: 3 });
  assert.equal(response.statusCode, 201);
  assert.equal(response.json().cantidad, 5);
  assert.equal(response.json().subtotal, 150);
  assert.equal(getState().items.find((item) => item.carrito_id === 22 && item.producto_id === 1).cantidad, 5);
  assert.ok(calls.every(({ sql }) => !/\$\{/.test(sql)));
  assert.deepEqual(calls.find(({ sql }) => sql.includes("WHERE usuario_id = $1 FOR UPDATE")).values, [2]);
  assert.ok(calls.some(({ sql, values }) => sql.includes("FROM producto WHERE id = $1") && values[0] === 1));
  assert.ok(calls.some(({ sql }) => sql === "COMMIT"));
});

test("PATCH actualiza y DELETE elimina solo el item del carrito propio", async () => {
  const { app, getState } = await createApp();
  const updated = await request(app, 2, "PATCH", "/api/carrito/items/1", { cantidad: 4 });
  assert.equal(updated.statusCode, 200);
  assert.equal(updated.json().cantidad, 4);
  const deleted = await request(app, 2, "DELETE", "/api/carrito/items/1");
  assert.equal(deleted.statusCode, 204);
  assert.equal(getState().items.some((item) => item.carrito_id === 22 && item.producto_id === 1), false);
  assert.equal(getState().items.find((item) => item.carrito_id === 11 && item.producto_id === 1).cantidad, 7);
});

test("GET crea un carrito vacío propio y devuelve categoría textual nullable", async () => {
  const { app } = await createApp();
  const response = await request(app, 9, "GET", "/api/carrito");
  assert.equal(response.statusCode, 200);
  assert.equal(response.json().usuarioId, 9);
  assert.deepEqual(response.json().items, []);
  assert.equal(response.json().total, 0);
});

test("IDs y cantidades inválidos se rechazan; producto inexistente/inactivo da 404 y stock insuficiente 409", async () => {
  const { app } = await createApp();
  assert.equal((await request(app, 2, "PATCH", "/api/carrito/items/abc", { cantidad: 1 })).statusCode, 400);
  assert.equal((await request(app, 2, "POST", "/api/carrito/items", { productoId: 1, cantidad: 0 })).statusCode, 400);
  assert.equal((await request(app, 2, "POST", "/api/carrito/items", { productoId: 99, cantidad: 1 })).statusCode, 404);
  assert.equal((await request(app, 2, "POST", "/api/carrito/items", { productoId: 3, cantidad: 1 })).statusCode, 404);
  assert.equal((await request(app, 2, "POST", "/api/carrito/items", { productoId: 2, cantidad: 1 })).statusCode, 409);
  assert.equal((await request(app, 2, "PATCH", "/api/carrito/items/1", { cantidad: 11 })).statusCode, 409);
  assert.equal((await request(app, 2, "DELETE", "/api/carrito/items/2")).statusCode, 404);
});

test("fallos de base revierten los cambios y no responden como éxito", async () => {
  const { app, calls, getState } = await createApp({ failOn: "UPDATE carrito SET fecha_actualizacion" });
  const before = structuredClone(getState());
  const response = await request(app, 2, "POST", "/api/carrito/items", { productoId: 1, cantidad: 1 });
  assert.equal(response.statusCode, 500);
  assert.deepEqual(getState(), before);
  assert.equal(calls.at(-1).sql, "ROLLBACK");
});

test("las escrituras toman el bloqueo del carrito antes de producto o items, igual que checkout", async () => {
  const { app, calls } = await createApp();
  await request(app, 2, "POST", "/api/carrito/items", { productoId: 1, cantidad: 1 });
  const cartLock = calls.findIndex(({ sql }) => sql.includes("WHERE usuario_id = $1 FOR UPDATE"));
  const productLock = calls.findIndex(({ sql }) => sql.includes("FROM producto WHERE id = $1 FOR UPDATE"));
  const itemMutation = calls.findIndex(({ sql }) => sql.startsWith("UPDATE carrito_item") || sql.startsWith("INSERT INTO carrito_item"));
  assert.ok(cartLock >= 0 && productLock > cartLock && itemMutation > productLock);
  assert.equal(calls.find(({ sql }) => sql.includes("WHERE usuario_id = $1 FOR UPDATE")).sql,
    "SELECT id, usuario_id, fecha_actualizacion FROM carrito\n       WHERE usuario_id = $1 FOR UPDATE");
});
