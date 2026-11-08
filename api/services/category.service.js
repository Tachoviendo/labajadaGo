export async function listar(app) {
  const { rows } = await app.pg.query(`
    SELECT
      id,
      nombre,
      descripcion
    FROM categoria
    ORDER BY nombre ASC
  `);

  return rows.map((row) => ({
    id: row.id,
    nombre: row.nombre,
    descripcion: row.descripcion,
  }));
}
