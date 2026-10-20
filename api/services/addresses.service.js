import { BadRequestError, ForbiddenError, NotFoundError } from "../errors/response.errors.js";

const columnasDireccion = {
  calle: "calle",
  numero: "numero",
  ciudad: "ciudad",
  referencia: "referencia",
};

export async function listForUser(app, usuarioId) {
  const { rows } = await app.pg.query(
    `SELECT id, usuario_id, calle, numero, ciudad, referencia
     FROM direccion WHERE usuario_id = $1 ORDER BY id`,
    [usuarioId],
  );
  return rows.map(aPublica);
}

export async function getById(app, id, usuarioId) {
  const { rows } = await app.pg.query(
    `SELECT usuario_id = $2 AS propia,
            CASE WHEN usuario_id = $2 THEN id END AS id,
            CASE WHEN usuario_id = $2 THEN usuario_id END AS usuario_id,
            CASE WHEN usuario_id = $2 THEN calle END AS calle,
            CASE WHEN usuario_id = $2 THEN numero END AS numero,
            CASE WHEN usuario_id = $2 THEN ciudad END AS ciudad,
            CASE WHEN usuario_id = $2 THEN referencia END AS referencia
     FROM direccion WHERE id = $1`,
    [id, usuarioId],
  );

  if (!rows[0]) throw new NotFoundError("dirección inexistente");
  if (rows[0].propia !== true) {
    throw new ForbiddenError("esa dirección pertenece a otro usuario");
  }
  return aPublica(rows[0]);
}

export async function create(app, usuarioId, datos) {
  rechazarPredeterminada(datos);
  const { rows } = await app.pg.query(
    `INSERT INTO direccion (usuario_id, calle, numero, ciudad, referencia)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, usuario_id, calle, numero, ciudad, referencia`,
    [usuarioId, datos.calle, datos.numero ?? null, datos.ciudad, datos.referencia ?? null],
  );
  return aPublica(rows[0]);
}

export async function update(app, id, usuarioId, cambios) {
  rechazarPredeterminada(cambios);
  const entradas = Object.entries(cambios).filter(([campo]) =>
    Object.hasOwn(columnasDireccion, campo),
  );

  if (entradas.length === 0) return getById(app, id, usuarioId);

  const valores = entradas.map(([, valor]) => valor);
  const asignaciones = entradas.map(
    ([campo], indice) => `${columnasDireccion[campo]} = $${indice + 1}`,
  );
  valores.push(id, usuarioId);

  const { rows } = await app.pg.query(
    `UPDATE direccion SET ${asignaciones.join(", ")}
     WHERE id = $${valores.length - 1} AND usuario_id = $${valores.length}
     RETURNING id, usuario_id, calle, numero, ciudad, referencia`,
    valores,
  );
  if (rows[0]) return aPublica(rows[0]);

  const { rows: estado } = await app.pg.query(
    `SELECT EXISTS (SELECT 1 FROM direccion WHERE id = $1) AS existe,
            EXISTS (SELECT 1 FROM direccion WHERE id = $1 AND usuario_id = $2) AS propia`,
    [id, usuarioId],
  );
  if (!estado[0].existe) throw new NotFoundError("dirección inexistente");
  throw new ForbiddenError("esa dirección pertenece a otro usuario");
}

function rechazarPredeterminada(datos) {
  if (datos.esPredeterminada === true) {
    throw new BadRequestError("esPredeterminada todavía no se puede activar");
  }
}

function aPublica(direccion) {
  return {
    id: direccion.id,
    usuarioId: direccion.usuario_id,
    calle: direccion.calle,
    numero: direccion.numero,
    ciudad: direccion.ciudad,
    referencia: direccion.referencia,
    esPredeterminada: false,
  };
}
