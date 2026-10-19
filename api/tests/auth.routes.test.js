import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import Fastify from "fastify";
import authRoutes from "../src/routes/auth.routes.js";

const apps = [];

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

function createApp() {
  const users = new Map();
  const app = Fastify();
  apps.push(app);

  app.decorate("pg", {
    async query(sql, values) {
      const [name, email, password, telefono] = values ?? [];

      if (sql.includes("SELECT id FROM usuario")) {
        const user = [...users.values()].find((entry) => entry.email === values[0]);
        return { rows: user ? [{ id: user.id }] : [] };
      }

      if (sql.includes("SELECT id, nombre, email, password")) {
        const user = [...users.values()].find((entry) => entry.email === values[0]);
        return { rows: user ? [user] : [] };
      }

      if (sql.includes("INSERT INTO usuario")) {
        const user = {
          id: users.size + 1,
          nombre: name,
          email,
          password,
          telefono,
          rol: "cliente",
          activo: true,
          fecha_creacion: new Date("2026-01-01T00:00:00.000Z"),
        };
        users.set(user.id, user);
        return { rows: [user] };
      }

      throw new Error(`Query inesperada en el test: ${sql}`);
    },
  });
  app.decorate("jwt", {
    sign: ({ id, rol }) => `test-token-${id}-${rol}`,
  });
  app.decorate("authenticate", async () => {});
  app.register(authRoutes, { prefix: "/api" });

  return { app, users };
}

async function registerUser(app, password = "password-segura") {
  return app.inject({
    method: "POST",
    url: "/api/auth/register",
    payload: {
      nombre: "Usuario Prueba",
      email: "usuario@example.com",
      password,
    },
  });
}

test("registro almacena un hash y login devuelve JWT y usuario público", async () => {
  const { app, users } = createApp();
  const registerResponse = await registerUser(app);

  assert.equal(registerResponse.statusCode, 201);
  const savedUser = users.get(1);
  assert.match(savedUser.password, /^scrypt\$16384\$8\$1\$/);
  assert.notEqual(savedUser.password, "password-segura");
  assert.equal(registerResponse.json().usuario.password, undefined);
  assert.equal(registerResponse.json().usuario.passwordHash, undefined);

  const loginResponse = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: { email: "usuario@example.com", password: "password-segura" },
  });

  assert.equal(loginResponse.statusCode, 200);
  assert.deepEqual(Object.keys(loginResponse.json()).sort(), ["token", "usuario"]);
  assert.equal(loginResponse.json().token, "test-token-1-cliente");
  assert.equal(loginResponse.json().usuario.password, undefined);
  assert.equal(loginResponse.json().usuario.passwordHash, undefined);
});

test("login rechaza una contraseña incorrecta con 401", async () => {
  const { app } = createApp();
  await registerUser(app);

  const response = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: { email: "usuario@example.com", password: "incorrecta" },
  });

  assert.equal(response.statusCode, 401);
});

test("login rechaza un usuario inexistente con 401", async () => {
  const { app } = createApp();

  const response = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: { email: "inexistente@example.com", password: "password-segura" },
  });

  assert.equal(response.statusCode, 401);
});

test("login rechaza un usuario inactivo con 401", async () => {
  const { app, users } = createApp();
  await registerUser(app);
  users.get(1).activo = false;

  const response = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    payload: { email: "usuario@example.com", password: "password-segura" },
  });

  assert.equal(response.statusCode, 401);
});
