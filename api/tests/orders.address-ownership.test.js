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
  if (originalFastifySecret === undefined) {
    delete process.env.FASTIFY_SECRET;
  } else {
    process.env.FASTIFY_SECRET = originalFastifySecret;
  }
});

function initialState(options = {}) {
  const { addressOwner = 5, cartItems = null, products = null } = options;
  return {
    address: {
      id: 10,
      usuario_id: addressOwner,
      calle: "18 de Julio",
      numero: "123",
      ciudad: "Bella Unión",
      referencia: null,
    },
    cart: options.cart === undefined ? { id: 20, usuario_id: 5, fecha_actualizacion: new Date() } : options.cart,
    cartItems: cartItems ?? [
      { producto_id: 2, cantidad: 2 },
      { producto_id: 2, cantidad: 3 },
      { producto_id: 4, cantidad: 1 },
    ],
    products: products ?? [
      { id: 2, nombre: "Yerba", precio: 30, stock: 20, activo: true },
      { id: 4, nombre: "Azúcar", precio: 90, stock: 5, activo: true },
    ],
    orders: [],
    orderItems: [],
    history: [],
  };
}

async function createApp(options = {}) {
  process.env.FASTIFY_SECRET = "orders-checkout-test-secret";
  const app = Fastify();
  const calls = [];
  let state = initialState(options);
  let snapshot;
  let released = 0;
  let orderId = 70;
  const failAfter = options.failAfter;

  const client = {
    async query(sql, values = []) {
      calls.push({ sql, values });
      const statement = sql.trim();
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
      if (statement.includes("SELECT id FROM carrito WHERE usuario_id = $1")) {
        rows = state.cart?.usuario_id === values[0] ? [{ id: state.cart.id }] : [];
      } else if (statement.startsWith("SELECT") && statement.includes("FROM carrito_item WHERE carrito_id = $1")) {
        const agrupados = new Map();
        for (const item of state.cartItems) {
          agrupados.set(item.producto_id, (agrupados.get(item.producto_id) ?? 0) + item.cantidad);
        }
        rows = [...agrupados]
          .sort(([a], [b]) => a - b)
          .map(([producto_id, cantidad]) => ({ producto_id, cantidad }));
      } else if (statement.includes("FROM direccion WHERE id = $1 AND usuario_id = $2")) {
        rows = state.address?.id === values[0] && state.address.usuario_id === values[1]
          ? [state.address]
          : [];
      } else if (statement.includes("FROM producto WHERE id = ANY($1::integer[])")) {
        const ids = new Set(values[0]);
        rows = state.products
          .filter((product) => ids.has(product.id))
          .sort((a, b) => a.id - b.id);
      } else if (statement.includes("INSERT INTO pedido (")) {
        const [usuario_id, direccion_id, metodo_pago, total] = values;
        const pedido = {
          id: orderId++, usuario_id, direccion_id,
          estado: "realizado", metodo_pago, total,
          fecha_creacion: new Date("2026-01-02T03:04:05.000Z"),
        };
        state.orders.push(pedido);
        rows = [pedido];
      } else if (statement.includes("INSERT INTO pedido_item")) {
        const [pedido_id, producto_id, nombre_producto, cantidad, precio_unitario] = values;
        const item = {
          id: state.orderItems.length + 1,
          pedido_id, producto_id, nombre_producto, cantidad, precio_unitario,
        };
        state.orderItems.push(item);
        rows = [item];
      } else if (statement.includes("UPDATE producto SET stock = stock - $1")) {
        const [cantidad, productoId] = values;
        const product = state.products.find((entry) => entry.id === productoId);
        if (product?.activo && product.stock >= cantidad) {
          product.stock -= cantidad;
          rows = [{ id: product.id }];
        }
      } else if (statement.includes("INSERT INTO pedido_estado_historial")) {
        state.history.push({ pedido_id: values[0], estado: "realizado", usuario_id: values[1] });
      } else if (statement.includes("DELETE FROM carrito_item WHERE carrito_id = $1")) {
        state.cartItems = [];
      } else if (statement.includes("UPDATE carrito SET fecha_actualizacion = now()")) {
        state.cart.fecha_actualizacion = new Date();
      } else {
        throw new Error(`Consulta inesperada: ${statement}`);
      }

      if (failAfter && statement.includes(failAfter)) {
        throw new Error(`Fallo simulado después de ${failAfter}`);
      }
      return { rows };
    },
    release() {
      released += 1;
    },
  };

  app.decorate("pg", {
    async connect() {
      return client;
    },
  });
  app.register(errorHandler);
  app.register(jwtPlugin);
  app.register(orderRoutes, { prefix: "/api" });
  await app.ready();
  if (originalFastifySecret === undefined) {
    delete process.env.FASTIFY_SECRET;
  } else {
    process.env.FASTIFY_SECRET = originalFastifySecret;
  }
  apps.push(app);
  return { app, calls, getState: () => state, getReleased: () => released };
}

function request(app, userId = 5, payload = { direccionId: 10, metodoPago: "pos" }) {
  const token = app.jwt.sign({ id: userId, rol: "cliente" }, { expiresIn: "1h" });
  return app.inject({
    method: "POST",
    url: "/api/pedidos",
    headers: { authorization: `Bearer ${token}` },
    payload,
  });
}

test("POST /pedidos crea el checkout, agrupa items y deriva datos de PostgreSQL y del token", async () => {
  const { app, calls, getState, getReleased } = await createApp();
  const response = await request(app, 5, {
    direccionId: 10,
    metodoPago: "pos",
    usuarioId: 99,
    carritoId: 999,
    total: 1,
    items: [{ productoId: 999, cantidad: 999, precio: 1 }],
  });

  assert.equal(response.statusCode, 201);
  assert.deepEqual(response.json(), {
    id: 70,
    usuarioId: 5,
    direccion: {
      id: 10,
      usuarioId: 5,
      calle: "18 de Julio",
      numero: "123",
      ciudad: "Bella Unión",
      referencia: null,
      esPredeterminada: false,
    },
    items: [
      { id: 1, productoId: 2, nombreProducto: "Yerba", cantidad: 5, precioUnitario: 30, subtotal: 150 },
      { id: 2, productoId: 4, nombreProducto: "Azúcar", cantidad: 1, precioUnitario: 90, subtotal: 90 },
    ],
    estado: "realizado",
    metodoPago: "pos",
    total: 240,
    fechaCreacion: "2026-01-02T03:04:05.000Z",
  });
  const state = getState();
  assert.deepEqual(state.orders[0], {
    id: 70, usuario_id: 5, direccion_id: 10, estado: "realizado",
    metodo_pago: "pos", total: 240, fecha_creacion: new Date("2026-01-02T03:04:05.000Z"),
  });
  assert.deepEqual(state.orderItems.map(({ producto_id, nombre_producto, cantidad, precio_unitario }) =>
    ({ producto_id, nombre_producto, cantidad, precio_unitario })), [
    { producto_id: 2, nombre_producto: "Yerba", cantidad: 5, precio_unitario: 30 },
    { producto_id: 4, nombre_producto: "Azúcar", cantidad: 1, precio_unitario: 90 },
  ]);
  assert.deepEqual(state.products.map(({ id, stock }) => ({ id, stock })), [
    { id: 2, stock: 15 },
    { id: 4, stock: 4 },
  ]);
  assert.deepEqual(state.history, [{ pedido_id: 70, estado: "realizado", usuario_id: 5 }]);
  assert.deepEqual(state.cartItems, []);
  assert.deepEqual(calls.find(({ sql }) => sql.includes("FROM carrito WHERE usuario_id" )).values, [5]);
  assert.deepEqual(calls.find(({ sql }) => sql.includes("FROM direccion WHERE id" )).values, [10, 5]);
  assert.deepEqual(calls.find(({ sql }) => sql.includes("INSERT INTO pedido (" )).values, [5, 10, "pos", 240]);
  assert.match(calls.find(({ sql }) => sql.includes("nombre_producto" )).sql, /\$1[\s\S]*\$5/);
  assert.deepEqual(calls.filter(({ sql }) => /FOR UPDATE/.test(sql)).map(({ sql }) => sql.includes("carrito")), [true, false]);
  assert.equal(calls.at(-1).sql, "COMMIT");
  assert.equal(getReleased(), 1);
});

test("direcciones ajenas, legacy sin dueño e inexistentes devuelven 404 sin escrituras", async () => {
  for (const addressOwner of [6, null]) {
    const { app, calls, getState } = await createApp({ addressOwner });
    const response = await request(app);
    assert.equal(response.statusCode, 404);
    assert.equal(response.json().code, "NOTFOUND");
    assert.equal(getState().orders.length, 0);
    assert.equal(calls.some(({ sql }) => /INSERT INTO|UPDATE producto|DELETE FROM/.test(sql)), false);
  }

  const { app, calls, getState } = await createApp();
  const response = await request(app, 5, { direccionId: 999, metodoPago: "pos" });
  assert.equal(response.statusCode, 404);
  assert.equal(getState().orders.length, 0);
  assert.equal(calls.some(({ sql }) => /INSERT INTO|UPDATE producto|DELETE FROM/.test(sql)), false);
});

test("el carrito se busca por el usuario del token y no se puede elegir otro usuario", async () => {
  const { app, calls, getState } = await createApp();
  const response = await request(app, 6, {
    direccionId: 10,
    metodoPago: "pos",
    usuarioId: 5,
    carritoId: 20,
  });

  assert.equal(response.statusCode, 409);
  assert.deepEqual(calls.find(({ sql }) => sql.includes("FROM carrito WHERE usuario_id")).values, [6]);
  assert.equal(calls.some(({ sql }) => sql.includes("FROM carrito_item")), false);
  assert.equal(getState().orders.length, 0);
  assert.equal(getState().cartItems.length, 3);
});

test("carrito vacío, stock insuficiente y producto inactivo devuelven 409", async () => {
  for (const options of [
    { cartItems: [] },
    { cart: null },
    { products: [{ id: 2, nombre: "Yerba", precio: 30, stock: 2, activo: true }, { id: 4, nombre: "Azúcar", precio: 90, stock: 5, activo: true }] },
    { products: [{ id: 2, nombre: "Yerba", precio: 30, stock: 20, activo: false }, { id: 4, nombre: "Azúcar", precio: 90, stock: 5, activo: true }] },
  ]) {
    const { app, getState } = await createApp(options);
    const response = await request(app);
    assert.equal(response.statusCode, 409);
    assert.equal(response.json().code, "CONFLICT");
    assert.equal(getState().orders.length, 0);
    assert.equal(getState().orderItems.length, 0);
    assert.equal(getState().cartItems.length, options.cartItems?.length ?? 3);
  }
});

test("cada fallo después de una escritura hace rollback de todo el checkout", async () => {
  for (const failAfter of [
    "INSERT INTO pedido (",
    "INSERT INTO pedido_item",
    "UPDATE producto SET stock",
    "INSERT INTO pedido_estado_historial",
    "DELETE FROM carrito_item",
    "UPDATE carrito SET fecha_actualizacion",
  ]) {
    const { app, calls, getState, getReleased } = await createApp({ failAfter });
    const response = await request(app);
    assert.equal(response.statusCode, 500);
    assert.equal(getState().orders.length, 0, failAfter);
    assert.equal(getState().orderItems.length, 0, failAfter);
    assert.equal(getState().history.length, 0, failAfter);
    assert.deepEqual(getState().products.map(({ stock }) => stock), [20, 5], failAfter);
    assert.equal(getState().cartItems.length, 3, failAfter);
    assert.equal(calls.at(-1).sql, "ROLLBACK", failAfter);
    assert.equal(getReleased(), 1, failAfter);
  }
});
