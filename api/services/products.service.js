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

  if (filters.nombre?.trim()) {
    addFilter("p.nombre ILIKE ?", `%${filters.nombre.trim()}%`);
  }

  if (filters.categoriaId !== undefined) {
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

  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  const offset = (page - 1) * limit;

  // Obtener la cantidad total de productos que cumplen los filtros.
  const countResult = await app.pg.query(
    `SELECT COUNT(*) AS total
     FROM producto p
     INNER JOIN categoria c ON c.id = p.categoria_id
     ${where}`,
    values,
  );

  const total = Number(countResult.rows[0].total);

  // Obtener únicamente los productos de la página solicitada.
  const dataValues = [...values, limit, offset];
  const limitParam = dataValues.length - 1;
  const offsetParam = dataValues.length;

  const { rows } = await app.pg.query(
    `${productSelect}
     ${where}
     ORDER BY ${sort}, p.id ASC
     LIMIT $${limitParam} OFFSET $${offsetParam}`,
    dataValues,
  );

  return {
    data: rows.map(mapProduct),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
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
