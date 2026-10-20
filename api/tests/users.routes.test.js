import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import Fastify from "fastify";
import errorHandler from "../plugins/errorHandler.js";
import jwtPlugin from "../plugins/jwt.js";
import userRoutes from "../src/routes/users.routes.js";

const apps = [];
const originalFastifySecret = process.env.FASTIFY_SECRET;
const camposPublicos = [
  "id",
  "nombre",
  "email",
  "telefono",
  "rol",
  "activo",
  "fechaCreacion",
];

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
  if (originalFastifySecret === undefined) {
    delete process.env.FASTIFY_SECRET;
  } else {
    process.env.FASTIFY_SECRET = originalFastifySecret;
  }
});

async function createApp() {
  process.env.FASTIFY_SECRET = "users-route-test-secret";
  const app = Fastify();
  const calls = [];
  const users = new Map([
    [7, usuario(7, "cliente")],
    [8, usuario(8, "cajero")],
    [9, usuario(9, "dueno")],
  ]);

  app.decorate("pg", {
    async query(sql, values) {
      calls.push({ sql, values });
      if (sql.includes("SELECT id, nombre, email, telefono, rol, activo, fecha_creacion")) {
        const row = users.get(values[0]);
        return { rows: row ? [row] : [] };
      }

      if (sql.includes("UPDATE usuario SET")) {
        const setClause = sql.match(/UPDATE usuario SET ([\s\S]+?) WHERE id = \$(\d+)/);
        assert.ok(setClause, "el UPDATE debe limitarse al ID parametrizado");
        const cambios = [...setClause[1].matchAll(/([a-z_]+) = \$(\d+)/g)];
        const id = values[Number(setClause[2]) - 1];
        const row = users.get(id);
        if (!row) return { rows: [] };

        for (const [, columna, parametro] of cambios) {
          row[columna] = values[Number(parametro) - 1];
        }
        return { rows: [row] };
      }

      throw new Error(`Consulta inesperada: ${sql}`);
    },
  });

  app.register(errorHandler);
  app.register(jwtPlugin);
  app.register(userRoutes, { prefix: "/api" });
  await app.ready();
  if (originalFastifySecret === undefined) {
    delete process.env.FASTIFY_SECRET;
  } else {
    process.env.FASTIFY_SECRET = originalFastifySecret;
  }
  apps.push(app);
  return { app, calls, users };
}

function usuario(id, rol) {
  return {
    id,
    nombre: `Usuario ${id}`,
    email: `usuario${id}@example.com`,
    telefono: null,
    rol,
    activo: true,
    fecha_creacion: new Date("2026-01-01T00:00:00.000Z"),
    password: "scrypt$hash-privado",
  };
}

function token(app, id, rol) {
  return app.jwt.sign({ id, rol }, { expiresIn: "1h" });
}

function request(app, method, url, id, rol, payload) {
  return app.inject({
    method,
    url,
    headers: { authorization: `Bearer ${token(app, id, rol)}` },
    payload,
  });
}

function assertPublicUser(response, expectedId) {
  const body = response.json();
  assert.deepEqual(Object.keys(body).sort(), [...camposPublicos].sort());
  assert.equal(body.id, expectedId);
  assert.equal(JSON.stringify(body).includes("password"), false);
  assert.equal(JSON.stringify(body).includes("scrypt$hash-privado"), false);
}

test("GET /usuarios/:id permite el perfil propio y limita perfiles ajenos por rol", async () => {
  const { app, calls } = await createApp();

  for (const [rol, id] of [["cliente", 7], ["cajero", 8], ["dueno", 9]]) {
    const response = await request(app, "GET", `/api/usuarios/${id}`, id, rol);
    assert.equal(response.statusCode, 200);
    assertPublicUser(response, id);
    assert.match(calls.at(-1).sql, /WHERE id = \$1/);
    assert.deepEqual(calls.at(-1).values, [id]);
  }

  for (const [rol, id] of [["cliente", 7], ["cajero", 8]]) {
    const previousCalls = calls.length;
    const response = await request(app, "GET", "/api/usuarios/9", id, rol);
    assert.equal(response.statusCode, 403);
    assert.equal(calls.length, previousCalls);
  }

  const ownerResponse = await request(app, "GET", "/api/usuarios/8", 9, "dueno");
  assert.equal(ownerResponse.statusCode, 200);
  assertPublicUser(ownerResponse, 8);
  assert.deepEqual(calls.at(-1).values, [8]);

  const missing = await request(app, "GET", "/api/usuarios/999", 9, "dueno");
  assert.equal(missing.statusCode, 404);
  assert.deepEqual(calls.at(-1).values, [999]);
});

test("PATCH /usuarios/:id modifica solo los datos del perfil propio", async () => {
  const { app, calls, users } = await createApp();
  const response = await request(app, "PATCH", "/api/usuarios/7", 7, "cliente", {
    nombre: "Nombre actualizado",
  });

  assert.equal(response.statusCode, 200);
  assertPublicUser(response, 7);
  assert.equal(response.json().nombre, "Nombre actualizado");
  assert.match(calls[0].sql, /nombre = \$1/);
  assert.match(calls[0].sql, /WHERE id = \$2/);
  assert.equal(calls[0].values[0], "Nombre actualizado");
  assert.equal(calls[0].values[1], 7);
  assert.equal(users.get(7).password, "scrypt$hash-privado");

  for (const [id, rol] of [[7, "cliente"], [9, "dueno"]]) {
    const previousCalls = calls.length;
    const denied = await request(app, "PATCH", "/api/usuarios/8", id, rol, {
      nombre: "Cambio ajeno",
    });
    assert.equal(denied.statusCode, 403);
    assert.equal(calls.length, previousCalls);
  }
});

test("PATCH /usuarios/:id no permite cambiar la contraseña", async () => {
  const { app, calls } = await createApp();
  const response = await request(app, "PATCH", "/api/usuarios/7", 7, "cliente", {
    password: "nueva-password-segura",
  });

  assert.equal(response.statusCode, 400);
  assert.equal(calls.length, 0);
});

test("PATCH /usuarios/:id rechaza cambios de rol y estado por schema", async () => {
  const { app, calls } = await createApp();

  for (const payload of [{ rol: "dueno" }, { activo: false }]) {
    const response = await request(app, "PATCH", "/api/usuarios/7", 7, "cliente", payload);
    assert.equal(response.statusCode, 400);
    assert.equal(response.json().code, "BADREQUEST");
  }

  assert.equal(calls.length, 0);
});
