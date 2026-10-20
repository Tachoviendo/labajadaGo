import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import Fastify from "fastify";
import errorHandler from "../plugins/errorHandler.js";
import jwtPlugin from "../plugins/jwt.js";
import authRoutes from "../src/routes/auth.routes.js";
import { hashPassword } from "../services/password.service.js";

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
  process.env.FASTIFY_SECRET = "password-change-test-secret";
  const app = Fastify();
  const calls = [];
  const users = new Map([
    [7, await usuario(7, "cliente", "actual-segura")],
    [8, await usuario(8, "cliente", "otra-segura")],
  ]);

  app.decorate("pg", {
    async query(sql, values) {
      calls.push({ sql, values });
      if (sql.includes("SELECT password FROM usuario WHERE id = $1")) {
        const user = users.get(values[0]);
        return { rows: user ? [{ password: user.password }] : [] };
      }
      if (sql.includes("UPDATE usuario SET password = $1 WHERE id = $2")) {
        const user = users.get(values[1]);
        if (!user) return { rows: [] };
        user.password = values[0];
        return { rows: [{ id: user.id }] };
      }
      if (sql.includes("SELECT id, nombre, email, password")) {
        const user = [...users.values()].find((entry) => entry.email === values[0]);
        return { rows: user ? [user] : [] };
      }
      throw new Error(`Consulta inesperada en el test: ${sql}`);
    },
  });

  app.register(errorHandler);
  app.register(jwtPlugin);
  app.register(authRoutes, { prefix: "/api" });
  await app.ready();
  apps.push(app);
  return { app, calls, users };
}

async function usuario(id, rol, password) {
  return {
    id,
    nombre: `Usuario ${id}`,
    email: `usuario${id}@example.com`,
    password: await hashPassword(password),
    telefono: null,
    rol,
    activo: true,
    fecha_creacion: new Date("2026-01-01T00:00:00.000Z"),
  };
}

function token(app, id, rol = "cliente") {
  return app.jwt.sign({ id, rol }, { expiresIn: "1h" });
}

function cambiar(app, id, payload, autenticar = true) {
  return app.inject({
    method: "PATCH",
    url: "/api/auth/password",
    headers: autenticar ? { authorization: `Bearer ${token(app, id)}` } : {},
    payload,
  });
}

test("PATCH /auth/password cambia el hash de la cuenta autenticada y permite login nuevo", async () => {
  const { app, calls, users } = await createApp();
  const response = await cambiar(app, 7, {
    passwordActual: "actual-segura",
    passwordNueva: "nueva-segura",
  });

  assert.equal(response.statusCode, 204);
  assert.equal(response.body, "");
  assert.match(users.get(7).password, /^scrypt\$16384\$8\$1\$/);
  assert.notEqual(users.get(7).password, "nueva-segura");
  assert.notEqual(users.get(7).password, users.get(8).password);
  assert.deepEqual(calls[0].values, [7]);
  assert.match(calls[0].sql, /WHERE id = \$1/);
  assert.match(calls[1].sql, /WHERE id = \$2/);
  assert.equal(calls[1].values[1], 7);
  assert.match(calls[1].values[0], /^scrypt\$16384\$8\$1\$/);
  assert.equal(JSON.stringify(calls).includes("nueva-segura"), false);

  const login = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: { email: "usuario7@example.com", password: "nueva-segura" },
  });
  assert.equal(login.statusCode, 200);
});

test("PATCH /auth/password requiere autenticación y valida la contraseña actual", async () => {
  const { app, calls, users } = await createApp();
  const payload = { passwordActual: "actual-segura", passwordNueva: "nueva-segura" };
  const sinToken = await cambiar(app, 7, payload, false);
  assert.equal(sinToken.statusCode, 401);
  assert.equal(calls.length, 0);

  const incorrecta = await cambiar(app, 7, {
    ...payload,
    passwordActual: "no-es-la-actual",
  });
  assert.equal(incorrecta.statusCode, 400);
  assert.equal(calls.length, 1);
  assert.equal(users.get(7).password === "nueva-segura", false);
});

test("PATCH /auth/password rechaza nueva contraseña inválida e IDs enviados por el cliente", async () => {
  const { app, calls } = await createApp();

  const nuevaInvalida = await cambiar(app, 7, {
    passwordActual: "actual-segura",
    passwordNueva: "corta",
  });
  assert.equal(nuevaInvalida.statusCode, 400);
  assert.equal(calls.length, 0);

  const idManipulado = await cambiar(app, 7, {
    usuarioId: 8,
    passwordActual: "actual-segura",
    passwordNueva: "nueva-segura",
  });
  assert.equal(idManipulado.statusCode, 400);
  assert.equal(calls.length, 0);
});
