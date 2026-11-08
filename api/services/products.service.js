import { NotFoundError } from "../errors/response.errors.js";

function mapProduct(row) {
  return {
    id: row.id,
    nombre: row.nombre,
    descripcion: row.descripcion,
    precio: row.precio,
    categoria: {
      id: row.categoria_id,
      nombre: row.categoria_nombre,
      descripcion: row.categoria_descripcion,
    },
    imagenUrl: row.imagen_url,
    stock: row.stock,
    activo: row.activo,
  };
}

const productSelect = `
  SELECT
    p.id,
    p.nombre,
    p.descripcion,
    p.precio,
    p.categoria_id,
    c.nombre AS categoria_nombre,
    c.descripcion AS categoria_descripcion,
    p.imagen_url,
    p.stock,
    p.activo
  FROM producto p
  INNER JOIN categoria c ON c.id = p.categoria_id
`;

export async function listar(app, filters = {}) {
  const conditions = [];
  const values = [];

  function addFilter(condition, value) {
    values.push(value);
    conditions.push(condition.replace("?", `$${values.length}`));
  }

  // Por defecto, el catálogo muestra solamente productos activos.
  addFilter("p.activo = ?", filters.activo ?? true);

  if (filters.nombre) {
    addFilter("p.nombre ILIKE ?", `%${filters.nombre}%`);
  }

  if (filters.categoriaId) {
    addFilter("p.categoria_id = ?", filters.categoriaId);
  }

  if (filters.precioMin !== undefined) {
    addFilter("p.precio >= ?", filters.precioMin);
  }

  if (filters.precioMax !== undefined) {
    addFilter("p.precio <= ?", filters.precioMax);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const sortOptions = {
    precio_asc: "p.precio ASC",
    precio_desc: "p.precio DESC",
    nombre_asc: "p.nombre ASC",
    nombre_desc: "p.nombre DESC",
  };

  const sort = sortOptions[filters.sort] ?? sortOptions.nombre_asc;

  const limit = filters.limit ?? 20;
  const page = filters.page ?? 1;
  const offset = (page - 1) * limit;

  values.push(limit);
  const limitParam = values.length;

  values.push(offset);
  const offsetParam = values.length;

  const { rows } = await app.pg.query(
    `${productSelect}
     ${where}
     ORDER BY ${sort}
     LIMIT $${limitParam} OFFSET $${offsetParam}`,
    values,
  );

  return rows.map(mapProduct);
}

export async function obtener(app, id) {
  const { rows } = await app.pg.query(
    `${productSelect}
     WHERE p.id = $1`,
    [id],
  );

  if (!rows[0]) {
    throw new NotFoundError("el producto no existe");
  }

  return mapProduct(rows[0]);
}
