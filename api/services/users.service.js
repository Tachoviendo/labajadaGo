import {
  NotFoundError,
  ConflictError,
  BadRequestError,
} from "../errors/response.errors.js";
import { hashPassword } from "./password.service.js";
import { aPublico } from "./auth.service.js";

//columnas que se traen de un usuario, sin la password
const COLUMNAS = "id, nombre, email, telefono, rol, activo, fecha_creacion";

export async function listar(app, { rol, activo, page = 1, limit = 20 }) {
  const condiciones = [];
  const valores = [];

  if (rol !== undefined) {
    valores.push(rol);
    condiciones.push(`rol = $${valores.length}`);
  }
  if (activo !== undefined) {
    valores.push(activo);
    condiciones.push(`activo = $${valores.length}`);
  }
  const where = condiciones.length > 0 ? `WHERE ${condiciones.join(" AND ")}` : "";

  const { rows: conteo } = await app.pg.query(
    `SELECT COUNT(*)::int AS total FROM usuario ${where}`,
    valores,
  );
  const total = conteo[0].total;

  const { rows } = await app.pg.query(
    `SELECT ${COLUMNAS} FROM usuario ${where}
     ORDER BY id
     LIMIT $${valores.length + 1} OFFSET $${valores.length + 2}`,
    [...valores, limit, (page - 1) * limit],
  );

  return {
    data: rows.map(aPublico),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function obtener(app, id) {
  const { rows } = await app.pg.query(
    `SELECT ${COLUMNAS} FROM usuario WHERE id = $1`,
    [id],
  );
  if (rows.length === 0) {
    throw new NotFoundError("no existe un usuario con ese id");
  }
  return aPublico(rows[0]);
}

//alta de cuenta interna (cajero o dueño) hecha por el dueño
export async function crear(app, { nombre, email, password, telefono, rol }) {
  await verificarEmailLibre(app, email);

  const passwordHash = await hashPassword(password);
  const { rows } = await app.pg.query(
    `INSERT INTO usuario (nombre, email, password, telefono, rol)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${COLUMNAS}`,
    [nombre, email, passwordHash, telefono || null, rol],
  );
  return aPublico(rows[0]);
}

//edicion del propio perfil: nombre, email y telefono
export async function actualizar(app, id, { nombre, email, telefono }) {
  if (email !== undefined) {
    await verificarEmailLibre(app, email, id);
  }

  return guardarCambios(app, id, { nombre, email, telefono });
}

//cambios administrativos: activar/desactivar o cambiar el rol
export async function actualizarAdmin(app, id, { activo, rol }) {
  await obtener(app, id);
  return guardarCambios(app, id, { activo, rol });
}

//baja segun la ley 18331: se borran los datos personales y se desactiva la cuenta.
//no se borra la fila porque pedidos y pagos la siguen referenciando.
//las direcciones tambien se anonimizan, incluida la copia guardada en cada pedido.
//con un pedido en curso no se puede: todavia hace falta la direccion para entregarlo
export async function eliminar(app, id) {
  const client = await app.pg.connect();
  let transaccionIniciada = false;

  try {
    await client.query("BEGIN");
    transaccionIniciada = true;

    const { rows: usuarios } = await client.query(
      "SELECT id FROM usuario WHERE id = $1 FOR UPDATE",
      [id],
    );
    if (!usuarios[0]) throw new NotFoundError("usuario inexistente");

    const { rows: enCurso } = await client.query(
      `SELECT id FROM pedido
       WHERE usuario_id = $1 AND estado IN ('realizado', 'preparando', 'en_reparto')
       LIMIT 1`,
      [id],
    );
    if (enCurso[0]) {
      throw new ConflictError("no se puede dar de baja con pedidos en curso");
    }

    await client.query(
      `UPDATE usuario
       SET nombre = 'Usuario eliminado',
           email = $2,
           telefono = NULL,
           password = 'eliminado',
           activo = FALSE
       WHERE id = $1`,
      [id, `eliminado-${id}@labajada.invalid`],
    );
    await client.query(
      `UPDATE direccion
       SET calle = 'Eliminada', numero = NULL, ciudad = 'Eliminada', referencia = NULL
       WHERE usuario_id = $1`,
      [id],
    );
    await client.query(
      `UPDATE pedido
       SET direccion_calle = 'Eliminada', direccion_numero = NULL,
           direccion_ciudad = 'Eliminada', direccion_referencia = NULL
       WHERE usuario_id = $1`,
      [id],
    );

    await client.query("COMMIT");
    transaccionIniciada = false;
  } catch (error) {
    if (transaccionIniciada) {
      try {
        await client.query("ROLLBACK");
      } catch (errorRollback) {
        app.log.error({ err: errorRollback }, "falló el rollback de la baja");
      }
    }
    throw error;
  } finally {
    client.release();
  }
}

async function verificarEmailLibre(app, email, idPropio = null) {
  const { rows } = await app.pg.query(
    "SELECT id FROM usuario WHERE email = $1 AND id <> COALESCE($2, 0)",
    [email, idPropio],
  );
  if (rows.length > 0) {
    throw new ConflictError("ya existe una cuenta con ese email");
  }
}

//arma el UPDATE solo con los campos que vinieron (los undefined no se tocan)
async function guardarCambios(app, id, cambios) {
  const columnas = [];
  const valores = [];
  for (const [columna, valor] of Object.entries(cambios)) {
    if (valor !== undefined) {
      valores.push(valor);
      columnas.push(`${columna} = $${valores.length}`);
    }
  }
  //puede quedar vacio si solo vinieron campos que no se permiten (fastify los descarta)
  if (columnas.length === 0) {
    throw new BadRequestError("no hay campos válidos para modificar");
  }
  valores.push(id);

  const { rows } = await app.pg.query(
    `UPDATE usuario SET ${columnas.join(", ")}
     WHERE id = $${valores.length}
     RETURNING ${COLUMNAS}`,
    valores,
  );
  if (!rows[0]) {
    throw new NotFoundError("no existe un usuario con ese id");
  }
  return aPublico(rows[0]);
}
