import { ConflictError, NotFoundError } from "../errors/response.errors.js";

async function withLockedCart(app, usuarioId, operation) {
  const client = await app.pg.connect();
  let transactionStarted = false;

  try {
    await client.query("BEGIN");
    transactionStarted = true;
    await client.query(
      `INSERT INTO carrito (usuario_id) VALUES ($1)
       ON CONFLICT (usuario_id) DO NOTHING`,
      [usuarioId],
    );
    const { rows } = await client.query(
      `SELECT id, usuario_id, fecha_actualizacion FROM carrito
       WHERE usuario_id = $1 FOR UPDATE`,
      [usuarioId],
    );
    const result = await operation(client, rows[0]);
    await client.query("COMMIT");
    transactionStarted = false;
    return result;
  } catch (error) {
    if (transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        app.log.error({ err: rollbackError }, "falló el rollback del carrito");
      }
    }
    throw error;
  } finally {
    client.release();
  }
}

function mapProduct(row) {
  return {
    id: row.producto_id,
    nombre: row.nombre,
    descripcion: row.descripcion,
    precio: row.precio,
    categoria: row.categoria,
    imagenUrl: row.imagen_url,
    stock: row.stock,
    activo: row.activo,
  };
}

function mapItem(row) {
  return {
    id: row.id,
    producto: mapProduct(row),
    cantidad: row.cantidad,
    subtotal: row.precio * row.cantidad,
  };
}

async function readItems(client, carritoId, productoId) {
  const values = [carritoId];
  const productFilter = productoId === undefined ? "" : "AND p.id = $2";
  if (productoId !== undefined) values.push(productoId);
  const { rows } = await client.query(
    `SELECT MIN(ci.id)::integer AS id, p.id AS producto_id, p.nombre,
            p.descripcion, p.precio, p.categoria, p.imagen_url, p.stock,
            p.activo, SUM(ci.cantidad)::integer AS cantidad
     FROM carrito_item ci
     JOIN producto p ON p.id = ci.producto_id
     WHERE ci.carrito_id = $1 ${productFilter}
     GROUP BY p.id
     ORDER BY p.id`,
    values,
  );
  return rows.map(mapItem);
}

async function getProductForUpdate(client, productoId) {
  const { rows } = await client.query(
    `SELECT id AS producto_id, nombre, descripcion, precio, categoria,
            imagen_url, stock, activo
     FROM producto WHERE id = $1 FOR UPDATE`,
    [productoId],
  );
  const product = rows[0];
  if (!product || !product.activo) {
    throw new NotFoundError("el producto no existe o está inactivo");
  }
  return product;
}

export async function getForUser(app, usuarioId) {
  return withLockedCart(app, usuarioId, async (client, cart) => {
    const items = await readItems(client, cart.id);
    return {
      id: cart.id,
      usuarioId: cart.usuario_id,
      items,
      total: items.reduce((total, item) => total + item.subtotal, 0),
      fechaActualizacion: new Date(cart.fecha_actualizacion).toISOString(),
    };
  });
}

export async function addItem(app, usuarioId, { productoId, cantidad }) {
  return withLockedCart(app, usuarioId, async (client, cart) => {
    const product = await getProductForUpdate(client, productoId);
    const { rows: existing } = await client.query(
      `SELECT id, cantidad FROM carrito_item
       WHERE carrito_id = $1 AND producto_id = $2
       ORDER BY id FOR UPDATE`,
      [cart.id, productoId],
    );
    const currentQuantity = existing.reduce((sum, item) => sum + item.cantidad, 0);
    const newQuantity = currentQuantity + cantidad;
    if (product.stock < newQuantity) {
      throw new ConflictError("no hay stock suficiente para esa cantidad");
    }

    let itemId;
    if (existing.length) {
      itemId = existing[0].id;
      await client.query(
        "UPDATE carrito_item SET cantidad = $1 WHERE id = $2 AND carrito_id = $3",
        [newQuantity, itemId, cart.id],
      );
      if (existing.length > 1) {
        await client.query(
          `DELETE FROM carrito_item
           WHERE carrito_id = $1 AND producto_id = $2 AND id <> $3`,
          [cart.id, productoId, itemId],
        );
      }
    } else {
      const { rows } = await client.query(
        `INSERT INTO carrito_item (carrito_id, producto_id, cantidad)
         VALUES ($1, $2, $3) RETURNING id`,
        [cart.id, productoId, cantidad],
      );
      itemId = rows[0].id;
    }
    await client.query(
      "UPDATE carrito SET fecha_actualizacion = now() WHERE id = $1",
      [cart.id],
    );
    const items = await readItems(client, cart.id, productoId);
    return { ...items[0], id: itemId };
  });
}

export async function updateItem(app, usuarioId, productoId, cantidad) {
  return withLockedCart(app, usuarioId, async (client, cart) => {
    const product = await getProductForUpdate(client, productoId);
    const { rows: existing } = await client.query(
      `SELECT id, cantidad FROM carrito_item
       WHERE carrito_id = $1 AND producto_id = $2
       ORDER BY id FOR UPDATE`,
      [cart.id, productoId],
    );
    if (!existing.length) {
      throw new NotFoundError("el producto no está en el carrito");
    }
    if (product.stock < cantidad) {
      throw new ConflictError("no hay stock suficiente para esa cantidad");
    }
    const itemId = existing[0].id;
    await client.query(
      "UPDATE carrito_item SET cantidad = $1 WHERE id = $2 AND carrito_id = $3",
      [cantidad, itemId, cart.id],
    );
    if (existing.length > 1) {
      await client.query(
        `DELETE FROM carrito_item
         WHERE carrito_id = $1 AND producto_id = $2 AND id <> $3`,
        [cart.id, productoId, itemId],
      );
    }
    await client.query(
      "UPDATE carrito SET fecha_actualizacion = now() WHERE id = $1",
      [cart.id],
    );
    const items = await readItems(client, cart.id, productoId);
    return { ...items[0], id: itemId };
  });
}

export async function removeItem(app, usuarioId, productoId) {
  return withLockedCart(app, usuarioId, async (client, cart) => {
    const { rowCount } = await client.query(
      "DELETE FROM carrito_item WHERE carrito_id = $1 AND producto_id = $2",
      [cart.id, productoId],
    );
    if (!rowCount) throw new NotFoundError("el producto no está en el carrito");
    await client.query(
      "UPDATE carrito SET fecha_actualizacion = now() WHERE id = $1",
      [cart.id],
    );
  });
}
