import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import Fastify from "fastify";
import errorHandler from "../plugins/errorHandler.js";
import jwtPlugin from "../plugins/jwt.js";
import addressRoutes from "../src/routes/addresses.routes.js";

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
  process.env.FASTIFY_SECRET = "addresses-route-test-secret";
  const app = Fastify();
  const calls = [];
  const addresses = new Map([
    [10, direccion(10, 1)],
    [11, direccion(11, 2)],
    [12, direccion(12, null)],
  ]);

  app.decorate("pg", {
    async query(sql, values) {
      calls.push({ sql, values });

      if (sql.includes("FROM direccion WHERE usuario_id = $1 ORDER BY id")) {
        return {
          rows: [...addresses.values()].filter(
            (address) => address.usuario_id === values[0],
          ),
        };
      }

      if (sql.includes("SELECT usuario_id = $2 AS propia")) {
        const address = addresses.get(values[0]);
        if (!address) return { rows: [] };
        const propia = address.usuario_id === values[1];
        return {
          rows: [
            propia
              ? { propia: true, ...address }
              : { propia: address.usuario_id === null ? null : false },
          ],
        };
      }

      if (sql.includes("INSERT INTO direccion")) {
        const [usuario_id, calle, numero, ciudad, referencia] = values;
        const address = direccion(20, usuario_id, { calle, numero, ciudad, referencia });
        addresses.set(address.id, address);
        return { rows: [address] };
      }

      if (sql.includes("UPDATE direccion SET")) {
        const setClause = sql.match(/UPDATE direccion SET ([\s\S]+?) WHERE id = \$(\d+) AND usuario_id = \$(\d+)/);
        assert.ok(setClause, "el UPDATE debe limitarse al ID y usuario parametrizados");
        const cambios = [...setClause[1].matchAll(/([a-z_]+) = \$(\d+)/g)];
        const id = values[Number(setClause[2]) - 1];
        const usuario_id = values[Number(setClause[3]) - 1];
        const address = addresses.get(id);
        if (!address || address.usuario_id !== usuario_id) return { rows: [] };

        for (const [, columna, parametro] of cambios) {
          address[columna] = values[Number(parametro) - 1];
        }
        return { rows: [address] };
      }

      if (sql.includes("SELECT EXISTS (SELECT 1 FROM direccion WHERE id = $1)")) {
        const address = addresses.get(values[0]);
        return {
          rows: [{
            existe: Boolean(address),
            propia: address?.usuario_id === values[1],
          }],
        };
      }

      throw new Error(`Consulta inesperada: ${sql}`);
    },
  });

  app.register(errorHandler);
  app.register(jwtPlugin);
  app.register(addressRoutes, { prefix: "/api" });
  await app.ready();
  if (originalFastifySecret === undefined) {
    delete process.env.FASTIFY_SECRET;
  } else {
    process.env.FASTIFY_SECRET = originalFastifySecret;
  }
  apps.push(app);
  return { app, calls, addresses };
}

function direccion(id, usuario_id, fields = {}) {
  return {
    id,
    usuario_id,
    calle: fields.calle ?? `Calle ${id}`,
    numero: fields.numero ?? "1",
    ciudad: fields.ciudad ?? "Bella Unión",
    referencia: fields.referencia ?? null,
  };
}

function request(app, method, url, usuarioId, payload) {
  const token = app.jwt.sign(
    { id: usuarioId, rol: "cliente" },
    { expiresIn: "1h" },
  );
  return app.inject({
    method,
    url,
    headers: { authorization: `Bearer ${token}` },
    payload,
  });
}

function assertAddress(response, id, usuarioId) {
  const body = response.json();
  assert.equal(body.id, id);
  assert.equal(body.usuarioId, usuarioId);
  assert.equal(body.esPredeterminada, false);
  assert.equal(JSON.stringify(body).includes("Calle ajena"), false);
}

test("GET /direcciones lista solo las direcciones del usuario con SQL parametrizado", async () => {
  const { app, calls } = await createApp();
  const response = await request(app, "GET", "/api/direcciones", 1);

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json().map((address) => address.id), [10]);
  assert.deepEqual(calls[0].values, [1]);
  assert.match(calls[0].sql, /usuario_id = \$1/);
  assert.equal(calls[0].sql.includes("usuario_id = 1"), false);
});

test("GET /direcciones/:id distingue propia, ajena, histórica sin dueño e inexistente", async () => {
  const { app, calls } = await createApp();

  const own = await request(app, "GET", "/api/direcciones/10", 1);
  assert.equal(own.statusCode, 200);
  assertAddress(own, 10, 1);
  assert.deepEqual(calls[0].values, [10, 1]);

  for (const id of [11, 12]) {
    const foreign = await request(app, "GET", `/api/direcciones/${id}`, 1);
    assert.equal(foreign.statusCode, 403);
    assert.equal(foreign.json().code, "FORBIDDEN");
    assert.equal(JSON.stringify(foreign.json()).includes(`Calle ${id}`), false);
    assert.deepEqual(calls.at(-1).values, [id, 1]);
  }

  const missing = await request(app, "GET", "/api/direcciones/999", 1);
  assert.equal(missing.statusCode, 404);
  assert.equal(missing.json().code, "NOTFOUND");
  assert.deepEqual(calls.at(-1).values, [999, 1]);
});

test("POST /direcciones toma el propietario del token y no del body", async () => {
  const { app, calls } = await createApp();
  const response = await request(app, "POST", "/api/direcciones", 1, {
    calle: "Nueva calle",
    ciudad: "Bella Unión",
    usuarioId: 2,
    usuario_id: 2,
  });

  assert.equal(response.statusCode, 201);
  assertAddress(response, 20, 1);
  assert.deepEqual(calls[0].values, [1, "Nueva calle", null, "Bella Unión", null]);
  assert.match(calls[0].sql, /VALUES \(\$1, \$2, \$3, \$4, \$5\)/);
  assert.equal(calls[0].sql.includes("usuario_id = 2"), false);
});

test("PATCH /direcciones/:id actualiza solo la propia y devuelve 403 o 404 sin filtrar datos", async () => {
  const { app, calls } = await createApp();
  const own = await request(app, "PATCH", "/api/direcciones/10", 1, {
    calle: "Calle actualizada",
  });

  assert.equal(own.statusCode, 200);
  assert.equal(own.json().calle, "Calle actualizada");
  assertAddress(own, 10, 1);
  assert.deepEqual(calls[0].values, ["Calle actualizada", 10, 1]);
  assert.match(calls[0].sql, /WHERE id = \$2 AND usuario_id = \$3/);

  for (const id of [11, 12]) {
    const foreign = await request(app, "PATCH", `/api/direcciones/${id}`, 1, {
      calle: "Calle ajena modificada",
    });
    assert.equal(foreign.statusCode, 403);
    assert.equal(foreign.json().code, "FORBIDDEN");
    assert.equal(JSON.stringify(foreign.json()).includes(`Calle ${id}`), false);
    assert.deepEqual(calls.at(-1).values, [id, 1]);
  }

  const missing = await request(app, "PATCH", "/api/direcciones/999", 1, {
    calle: "Calle inexistente",
  });
  assert.equal(missing.statusCode, 404);
  assert.equal(missing.json().code, "NOTFOUND");
  assert.deepEqual(calls.at(-1).values, [999, 1]);
});

test("esPredeterminada=true se rechaza mientras no exista persistencia para ese campo", async () => {
  const { app, calls } = await createApp();
  const response = await request(app, "POST", "/api/direcciones", 1, {
    calle: "Nueva calle",
    ciudad: "Bella Unión",
    esPredeterminada: true,
  });

  assert.equal(response.statusCode, 400);
  assert.equal(response.json().code, "BADREQUEST");

  const patchResponse = await request(app, "PATCH", "/api/direcciones/10", 1, {
    esPredeterminada: true,
  });
  assert.equal(patchResponse.statusCode, 400);
  assert.equal(patchResponse.json().code, "BADREQUEST");
  assert.equal(calls.length, 0);
});
