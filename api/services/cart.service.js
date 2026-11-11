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
    //el carrito no tiene id propio: su pk (y carrito_item.carrito_id) es el usuario_id
    const { rows } = await client.query(
      `SELECT usuario_id, fecha_actualizacion FROM carrito
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
    categoria: row.categoria_nombre,
    imagenUrl: row.imagen_url,
    stock: row.stock,
    activo: row.activo,
  };
}

//carrito_item no tiene id propio, el item se identifica por su producto
function mapItem(row) {
  return {
    id: row.producto_id,
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
    `SELECT
    p.id AS producto_id,
    p.nombre,
    p.descripcion,
    p.precio,
    c.nombre AS categoria_nombre,
    p.imagen_url,
    p.stock,
    p.activo,
    ci.cantidad
 FROM carrito_item ci
 JOIN producto p ON p.id = ci.producto_id
 JOIN categoria c ON c.id = p.categoria_id
 WHERE ci.carrito_id = $1 ${productFilter}
 ORDER BY p.id`,
    values,
  );
  return rows.map(mapItem);
}

async function getProductForUpdate(client, productoId) {
  const { rows } = await client.query(
    `SELECT
    p.id AS producto_id,
    p.nombre,
    p.descripcion,
    p.precio,
    c.nombre AS categoria_nombre,
    p.imagen_url,
    p.stock,
    p.activo
 FROM producto p
 JOIN categoria c ON c.id = p.categoria_id
 WHERE p.id = $1
 FOR UPDATE OF p`,
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
    const items = await readItems(client, cart.usuario_id);

    const total = items.reduce(
      (acumulado, item) => acumulado + item.subtotal,
      0,
    );

    return {
      id: cart.usuario_id,
      usuarioId: cart.usuario_id,
      items,
      total,
      fechaActualizacion: new Date(cart.fecha_actualizacion).toISOString(),
    };
  });
}

export async function addItem(app, usuarioId, { productoId, cantidad }) {
  return withLockedCart(app, usuarioId, async (client, cart) => {
    const product = await getProductForUpdate(client, productoId);
    const existing = await getItemForUpdate(client, cart.usuario_id, productoId);
    const newQuantity = (existing?.cantidad ?? 0) + cantidad;
    if (product.stock < newQuantity) {
      throw new ConflictError("no hay stock suficiente para esa cantidad");
    }

    if (existing) {
      await setItemQuantity(client, cart.usuario_id, productoId, newQuantity);
    } else {
      await client.query(
        `INSERT INTO carrito_item (carrito_id, producto_id, cantidad)
   VALUES ($1, $2, $3)`,
        [cart.usuario_id, productoId, cantidad],
      );
    }
    await touchCart(client, cart.usuario_id);
    const items = await readItems(client, cart.usuario_id, productoId);
    return items[0];
  });
}

async function getItemForUpdate(client, carritoId, productoId) {
  const { rows } = await client.query(
    `SELECT cantidad FROM carrito_item
     WHERE carrito_id = $1 AND producto_id = $2 FOR UPDATE`,
    [carritoId, productoId],
  );
  return rows[0];
}

async function setItemQuantity(client, carritoId, productoId, cantidad) {
  await client.query(
    "UPDATE carrito_item SET cantidad = $1 WHERE carrito_id = $2 AND producto_id = $3",
    [cantidad, carritoId, productoId],
  );
}

async function touchCart(client, carritoId) {
  await client.query(
    "UPDATE carrito SET fecha_actualizacion = now() WHERE usuario_id = $1",
    [carritoId],
  );
}

export async function updateItem(app, usuarioId, productoId, cantidad) {
  return withLockedCart(app, usuarioId, async (client, cart) => {
    const product = await getProductForUpdate(client, productoId);
    const existing = await getItemForUpdate(client, cart.usuario_id, productoId);
    if (!existing) {
      throw new NotFoundError("el producto no está en el carrito");
    }
    if (product.stock < cantidad) {
      throw new ConflictError("no hay stock suficiente para esa cantidad");
    }
    await setItemQuantity(client, cart.usuario_id, productoId, cantidad);
    await touchCart(client, cart.usuario_id);
    const items = await readItems(client, cart.usuario_id, productoId);
    return items[0];
  });
}

export async function removeItem(app, usuarioId, productoId) {
  return withLockedCart(app, usuarioId, async (client, cart) => {
    const { rowCount } = await client.query(
      "DELETE FROM carrito_item WHERE carrito_id = $1 AND producto_id = $2",
      [cart.usuario_id, productoId],
    );
    if (!rowCount) throw new NotFoundError("el producto no está en el carrito");
    await touchCart(client, cart.usuario_id);
  });
}
