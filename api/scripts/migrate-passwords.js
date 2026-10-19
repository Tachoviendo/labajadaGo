import "../src/env.js";
import pg from "pg";
import {
  hashPassword,
  isPasswordHash,
} from "../services/password.service.js";

const { Pool } = pg;
const pool = new Pool();
let client;
let transactionStarted = false;

try {
  client = await pool.connect();
  await client.query("BEGIN");
  transactionStarted = true;
  const { rows } = await client.query("SELECT id, password FROM usuario FOR UPDATE");
  let migratedCount = 0;

  for (const user of rows) {
    if (isPasswordHash(user.password)) {
      continue;
    }

    const passwordHash = await hashPassword(user.password);
    const { rowCount } = await client.query(
      "UPDATE usuario SET password = $1 WHERE id = $2 AND password = $3",
      [passwordHash, user.id, user.password],
    );
    if (rowCount !== 1) {
      throw new Error(`No se pudo migrar la contraseña del usuario ${user.id}`);
    }
    migratedCount += 1;
  }

  await client.query("COMMIT");
  transactionStarted = false;
  console.info(`Contraseñas migradas: ${migratedCount}`);
} catch (error) {
  if (client && transactionStarted) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error("No se pudo revertir la migración de contraseñas.", rollbackError);
    }
  }
  throw error;
} finally {
  client?.release();
  await pool.end();
}
