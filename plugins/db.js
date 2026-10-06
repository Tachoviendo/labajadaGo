import fp from "fastify-plugin";
import pg from "pg";

const { Pool } = pg;

export default fp(async (fastify) => {
  const pool = new Pool();

  await pool.query("SELECT 1");

  fastify.decorate("pg", pool);

  fastify.addHook("onClose", async () => {
    await pool.end();
  });
});