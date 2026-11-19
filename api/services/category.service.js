import { ConflictError, NotFoundError } from "../errors/response.errors.js";

const mapCategoria = (row) => ({
  id: row.id,
  nombre: row.nombre,
  descripcion: row.descripcion,
});

//categoria.nombre es UNIQUE: el 23505 de postgres se devuelve como 409 con un mensaje claro
function nombreRepetido(error) {
  if (error.code === "23505") {
    return new ConflictError("ya existe una categoría con ese nombre");
  }
  return error;
}

export async function listar(app) {
  const { rows } = await app.pg.query(`
    SELECT
      id,
      nombre,
      descripcion
    FROM categoria
    ORDER BY nombre ASC
  `);

  return rows.map(mapCategoria);
}

export async function obtener(app, id) {
  const { rows } = await app.pg.query(
    "SELECT id, nombre, descripcion FROM categoria WHERE id = $1",
    [id],
  );
  if (!rows[0]) throw new NotFoundError("la categoría no existe");
  return mapCategoria(rows[0]);
}

export async function crear(app, { nombre, descripcion }) {
  try {
    const { rows } = await app.pg.query(
      `INSERT INTO categoria (nombre, descripcion)
       VALUES ($1, $2)
       RETURNING id, nombre, descripcion`,
      [nombre.trim(), descripcion?.trim() || null],
    );
    return mapCategoria(rows[0]);
  } catch (error) {
    throw nombreRepetido(error);
  }
}

//solo cambia los campos que vienen (el schema exige al menos uno)
export async function actualizar(app, id, datos) {
  const sets = [];
  const values = [];
  if (datos.nombre !== undefined) {
    values.push(datos.nombre.trim());
    sets.push(`nombre = $${values.length}`);
  }
  if (datos.descripcion !== undefined) {
    values.push(datos.descripcion?.trim() || null);
    sets.push(`descripcion = $${values.length}`);
  }
  values.push(id);

  try {
    const { rows } = await app.pg.query(
      `UPDATE categoria SET ${sets.join(", ")}
       WHERE id = $${values.length}
       RETURNING id, nombre, descripcion`,
      values,
    );
    if (!rows[0]) throw new NotFoundError("la categoría no existe");
    return mapCategoria(rows[0]);
  } catch (error) {
    throw nombreRepetido(error);
  }
}
