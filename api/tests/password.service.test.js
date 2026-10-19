import assert from "node:assert/strict";
import { test } from "node:test";
import { hashPassword, isPasswordHash, verifyPassword } from "../services/password.service.js";

test("reconoce hashes válidos generados por el servicio de contraseñas", async () => {
  const passwordHash = await hashPassword("password-segura");

  assert.equal(isPasswordHash(passwordHash), true);
  assert.equal(await verifyPassword("password-segura", passwordHash), true);
});

test("no reconoce como hash una contraseña antigua que solo empieza con scrypt$", () => {
  assert.equal(isPasswordHash("scrypt$esta-era-una-contraseña-antigua"), false);
});

test("no reconoce hashes con parámetros o longitudes distintas a las generadas", async () => {
  const passwordHash = await hashPassword("password-segura");
  const fields = passwordHash.split("$");
  const wrongParameters = [...fields];
  wrongParameters[1] = "32768";
  const shortKey = [...fields];
  shortKey[5] = shortKey[5].slice(1);

  assert.equal(isPasswordHash(wrongParameters.join("$")), false);
  assert.equal(isPasswordHash(shortKey.join("$")), false);
});
