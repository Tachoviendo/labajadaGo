import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import Fastify from "fastify";
import errorHandler from "../plugins/errorHandler.js";
import jwtPlugin from "../plugins/jwt.js";
import addressRoutes from "../src/routes/addresses.routes.js";
import cartRoutes from "../src/routes/cart.routes.js";
import categoryRoutes from "../src/routes/categoria.routes.js";
import orderRoutes from "../src/routes/orders.routes.js";
import paymentRoutes from "../src/routes/payments.routes.js";
import productRoutes from "../src/routes/products.routes.js";
import userRoutes from "../src/routes/users.routes.js";

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

async function createApp() {
  process.env.FASTIFY_SECRET = "authorization-test-secret";
  const app = Fastify();
  apps.push(app);

  app.register(errorHandler);
  app.register(jwtPlugin);
  app.addHook("onRoute", (routeOptions) => {
    routeOptions.handler = async (_request, reply) => reply.code(204).send();
    routeOptions.schema.response = { 204: { type: "null" } };
  });
  app.register(userRoutes, { prefix: "/api" });
  app.register(categoryRoutes, { prefix: "/api" });
  app.register(productRoutes, { prefix: "/api" });
  app.register(cartRoutes, { prefix: "/api" });
  app.register(orderRoutes, { prefix: "/api" });
  app.register(paymentRoutes, { prefix: "/api" });
  app.register(addressRoutes, { prefix: "/api" });

  await app.ready();
  if (originalFastifySecret === undefined) {
    delete process.env.FASTIFY_SECRET;
  } else {
    process.env.FASTIFY_SECRET = originalFastifySecret;
  }
  return app;
}

function tokenFor(app, rol) {
  return app.jwt.sign({ id: 1, rol }, { expiresIn: "1h" });
}

async function request(app, route, rol) {
  const headers = rol
    ? { authorization: `Bearer ${tokenFor(app, rol)}` }
    : {};
  return app.inject({ ...route, headers });
}

function assertError(response, statusCode, code) {
  assert.equal(response.statusCode, statusCode);
  assert.deepEqual(Object.keys(response.json()).sort(), [
    "code",
    "message",
    "statusCode",
  ]);
  assert.equal(response.json().statusCode, statusCode);
  assert.equal(response.json().code, code);
}

function assertAuthorizationPassed(response, route, rol) {
  assert.equal(
    response.statusCode,
    204,
    `${rol} should pass authorization hooks for ${route.method} ${route.url}`,
  );
}

async function assertRoleMatrix(app, routes, allowedRoles, deniedRoles) {
  for (const route of routes) {
    assertError(await request(app, route), 401, "UNAUTHENTICATED");
    for (const rol of deniedRoles) {
      assertError(await request(app, route, rol), 403, "FORBIDDEN");
    }
    for (const rol of allowedRoles) {
      assertAuthorizationPassed(await request(app, route, rol), route, rol);
    }
  }
}

test("GET /productos deja público el catálogo activo y limita activo=false al dueño", async () => {
  const app = await createApp();

  for (const url of ["/api/productos", "/api/productos?activo=true"]) {
    const response = await request(app, { method: "GET", url });
    assert.notEqual(response.statusCode, 401);
    assert.notEqual(response.statusCode, 403);
  }

  await assertRoleMatrix(
    app,
    [{ method: "GET", url: "/api/productos?activo=false" }],
    ["dueno"],
    ["cliente", "cajero"],
  );
});

test("las rutas administrativas requieren autenticación y rol dueño", async () => {
  const app = await createApp();
  const ownerRoutes = [
    { method: "GET", url: "/api/usuarios" },
    {
      method: "PATCH",
      url: "/api/usuarios/1/admin",
      payload: { activo: true },
    },
    { method: "DELETE", url: "/api/usuarios/1" },
    {
      method: "POST",
      url: "/api/productos",
      payload: { nombre: "Producto", precio: 100, categoriaId: 1 },
    },
    {
      method: "PATCH",
      url: "/api/productos/1",
      payload: { nombre: "Producto actualizado" },
    },
    { method: "DELETE", url: "/api/productos/1" },
    {
      method: "POST",
      url: "/api/categorias",
      payload: { nombre: "Categoría" },
    },
    {
      method: "PATCH",
      url: "/api/categorias/1",
      payload: { nombre: "Categoría actualizada" },
    },
  ];

  await assertRoleMatrix(app, ownerRoutes, ["dueno"], ["cliente", "cajero"]);
});

test("cambios de estado y pagos POS permiten solo cajero o dueño", async () => {
  const app = await createApp();
  const staffRoutes = [
    {
      method: "PATCH",
      url: "/api/pedidos/1/estado",
      payload: { estado: "preparando" },
    },
    { method: "PATCH", url: "/api/pagos/1/pos", payload: {} },
  ];

  await assertRoleMatrix(app, staffRoutes, ["cajero", "dueno"], ["cliente"]);
});

test("todas las operaciones existentes de carrito y direcciones exigen rol cliente", async () => {
  const app = await createApp();
  const clientRoutes = [
    { method: "GET", url: "/api/carrito" },
    {
      method: "POST",
      url: "/api/carrito/items",
      payload: { productoId: 1, cantidad: 1 },
    },
    {
      method: "PATCH",
      url: "/api/carrito/items/1",
      payload: { cantidad: 2 },
    },
    { method: "DELETE", url: "/api/carrito/items/1" },
    { method: "GET", url: "/api/direcciones" },
    { method: "GET", url: "/api/direcciones/1" },
    {
      method: "POST",
      url: "/api/direcciones",
      payload: { calle: "Rivera", ciudad: "Bella Unión" },
    },
    {
      method: "PATCH",
      url: "/api/direcciones/1",
      payload: { calle: "Artigas" },
    },
  ];

  await assertRoleMatrix(app, clientRoutes, ["cliente"], ["cajero", "dueno"]);
});
