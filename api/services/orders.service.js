import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "../errors/response.errors.js";
import { ORDEN_ESTADOS_PEDIDO } from "../schemas/enums.schema.js";

const orderColumns = `p.id, p.usuario_id, p.fecha_creacion, p.estado,
  p.metodo_pago, p.total, d.id AS direccion_id, d.usuario_id AS direccion_usuario_id,
  d.calle, d.numero, d.ciudad, d.referencia`;

async function loadItems(client, pedidoId) {
  const { rows } = await client.query(
    `SELECT id, producto_id, nombre_producto, cantidad, precio_unitario
     FROM pedido_item WHERE pedido_id = $1 ORDER BY id`,
    [pedidoId],
  );
  return rows.map((item) => ({
    id: item.id,
    productoId: item.producto_id,
    nombreProducto: item.nombre_producto,
    cantidad: item.cantidad,
    precioUnitario: item.precio_unitario,
    subtotal: item.precio_unitario * item.cantidad,
  }));
}

function mapOrder(order, items) {
  return {
    id: order.id,
    usuarioId: order.usuario_id,
    direccion: {
      id: order.direccion_id,
      usuarioId: order.direccion_usuario_id,
      calle: order.calle,
      numero: order.numero,
      ciudad: order.ciudad,
      referencia: order.referencia,
      esPredeterminada: false,
    },
    items,
    estado: order.estado,
    metodoPago: order.metodo_pago,
    total: order.total,
    fechaCreacion: order.fecha_creacion.toISOString(),
  };
}

async function loadOrder(client, id) {
  const { rows } = await client.query(
    `SELECT ${orderColumns}
     FROM pedido p JOIN direccion d ON d.id = p.direccion_id
     WHERE p.id = $1`,
    [id],
  );
  if (!rows[0]) throw new NotFoundError("el pedido no existe");
  return rows[0];
}

export async function getById(app, id, usuario) {
  const client = await app.pg.connect();
  try {
    const order = await loadOrder(client, id);
    if (usuario.rol === "cliente" && order.usuario_id !== usuario.id) {
      throw new ForbiddenError("el pedido pertenece a otro usuario");
    }
    return mapOrder(order, await loadItems(client, id));
  } finally {
    client.release();
  }
}

export async function listForUser(app, usuario, filters) {
  const client = await app.pg.connect();
  try {
    const conditions = [];
    const values = [];
    const addFilter = (expression, value) => {
      values.push(value);
      conditions.push(`${expression} $${values.length}`);
    };

    if (usuario.rol === "cliente") addFilter("p.usuario_id =", usuario.id);
    if (filters.estado) addFilter("p.estado =", filters.estado);
    if (filters.fechaDesde) addFilter("p.fecha_creacion::date >=", filters.fechaDesde);
    if (filters.fechaHasta) addFilter("p.fecha_creacion::date <=", filters.fechaHasta);

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const sort = filters.sort === "fecha_asc" ? "ASC" : "DESC";
    values.push(filters.limit ?? 20);
    const limitParameter = values.length;
    values.push(((filters.page ?? 1) - 1) * (filters.limit ?? 20));
    const offsetParameter = values.length;
    const { rows } = await client.query(
      `SELECT ${orderColumns}
       FROM pedido p JOIN direccion d ON d.id = p.direccion_id
       ${where}
       ORDER BY p.fecha_creacion ${sort}, p.id DESC
       LIMIT $${limitParameter} OFFSET $${offsetParameter}`,
      values,
    );
    return Promise.all(rows.map(async (order) =>
      mapOrder(order, await loadItems(client, order.id)),
    ));
  } finally {
    client.release();
  }
}

async function lockOrder(client, pedidoId) {
  const { rows } = await client.query(
    `SELECT id, usuario_id, estado, metodo_pago
     FROM pedido WHERE id = $1 FOR UPDATE`,
    [pedidoId],
  );
  if (!rows[0]) throw new NotFoundError("el pedido no existe");
  return rows[0];
}

async function cancelLockedOrder(client, order, actorId) {
  if (!["realizado", "preparando"].includes(order.estado)) {
    throw new ConflictError("el pedido ya no se puede cancelar en este estado");
  }

  const { rows: payments } = await client.query(
    `SELECT id, metodo, estado FROM pago
     WHERE pedido_id = $1 ORDER BY id FOR UPDATE`,
    [order.id],
  );
  if (payments.length > 1) {
    throw new ConflictError("no se puede determinar un único estado de pago");
  }
  if (payments[0]?.estado === "pagado") {
    throw new ConflictError("un pedido pagado no se puede cancelar directamente");
  }
  if (payments[0] && payments[0].metodo !== order.metodo_pago) {
    throw new ConflictError("el método del pago no coincide con el del pedido");
  }
  if (payments[0] && !["pendiente", "rechazado"].includes(payments[0].estado)) {
    throw new ConflictError("no se puede determinar el estado de pago");
  }
  if (order.metodo_pago === "mercadopago" && payments[0]?.estado !== "rechazado") {
    throw new ConflictError("no se puede verificar el estado del pago MercadoPago");
  }

  const { rows: items } = await client.query(
    `SELECT producto_id, SUM(cantidad)::integer AS cantidad
     FROM pedido_item WHERE pedido_id = $1
     GROUP BY producto_id ORDER BY producto_id`,
    [order.id],
  );
  const productoIds = items.map((item) => item.producto_id);
  if (productoIds.length) {
    const { rows: products } = await client.query(
      `SELECT id FROM producto
       WHERE id = ANY($1::integer[]) ORDER BY id FOR UPDATE`,
      [productoIds],
    );
    if (products.length !== productoIds.length) {
      throw new ConflictError("no se pudo restituir el stock del pedido");
    }
    for (const item of items) {
      const { rows } = await client.query(
        `UPDATE producto SET stock = stock + $1
         WHERE id = $2 RETURNING id`,
        [item.cantidad, item.producto_id],
      );
      if (!rows[0]) throw new ConflictError("no se pudo restituir el stock del pedido");
    }
  }

  const { rows: updated } = await client.query(
    `UPDATE pedido SET estado = 'cancelado'
     WHERE id = $1 AND estado = $2 RETURNING id`,
    [order.id, order.estado],
  );
  if (!updated[0]) throw new ConflictError("el pedido cambió mientras se cancelaba");
  await client.query(
    `INSERT INTO pedido_estado_historial (pedido_id, estado, usuario_id)
     VALUES ($1, 'cancelado', $2)`,
    [order.id, actorId],
  );
}

async function withOrderTransaction(app, operation) {
  const client = await app.pg.connect();
  let transactionStarted = false;
  try {
    await client.query("BEGIN");
    transactionStarted = true;
    const result = await operation(client);
    await client.query("COMMIT");
    transactionStarted = false;
    return result;
  } catch (error) {
    if (transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        app.log.error({ err: rollbackError }, "falló el rollback del pedido");
      }
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function changeStatus(app, pedidoId, actorId, estado) {
  return withOrderTransaction(app, async (client) => {
    const order = await lockOrder(client, pedidoId);
    if (estado === "cancelado") {
      await cancelLockedOrder(client, order, actorId);
    } else {
      const currentIndex = ORDEN_ESTADOS_PEDIDO.indexOf(order.estado);
      const nextIndex = ORDEN_ESTADOS_PEDIDO.indexOf(estado);
      if (currentIndex < 0 || nextIndex < 0 || Math.abs(currentIndex - nextIndex) !== 1) {
        throw new ConflictError("la transición de estado no está permitida");
      }
      await client.query(
        "UPDATE pedido SET estado = $1 WHERE id = $2",
        [estado, order.id],
      );
      await client.query(
        `INSERT INTO pedido_estado_historial (pedido_id, estado, usuario_id)
         VALUES ($1, $2, $3)`,
        [order.id, estado, actorId],
      );
    }
  });
}

export async function cancelByUser(app, pedidoId, usuarioId) {
  return withOrderTransaction(app, async (client) => {
    const order = await lockOrder(client, pedidoId);
    if (order.usuario_id !== usuarioId) {
      throw new ForbiddenError("el pedido pertenece a otro usuario");
    }
    await cancelLockedOrder(client, order, usuarioId);
  });
}

export async function createFromCart(app, usuarioId, { direccionId, metodoPago }) {
  const client = await app.pg.connect();
  let transactionStarted = false;

  try {
    await client.query("BEGIN");
    transactionStarted = true;

    const { rows: carritos } = await client.query(
      "SELECT id FROM carrito WHERE usuario_id = $1 FOR UPDATE",
      [usuarioId],
    );
    if (!carritos[0]) throw new ConflictError("el carrito está vacío");
    const carritoId = carritos[0].id;

    const { rows: itemsCarrito } = await client.query(
      `SELECT producto_id, SUM(cantidad)::integer AS cantidad
       FROM carrito_item WHERE carrito_id = $1
       GROUP BY producto_id ORDER BY producto_id`,
      [carritoId],
    );
    if (itemsCarrito.length === 0) throw new ConflictError("el carrito está vacío");

    const { rows: direcciones } = await client.query(
      `SELECT id, usuario_id, calle, numero, ciudad, referencia
       FROM direccion WHERE id = $1 AND usuario_id = $2 FOR SHARE`,
      [direccionId, usuarioId],
    );
    if (!direcciones[0]) {
      throw new NotFoundError("la dirección no existe o no pertenece al usuario");
    }

    const productoIds = itemsCarrito.map((item) => item.producto_id);
    const { rows: productos } = await client.query(
      `SELECT id, nombre, precio, stock, activo
       FROM producto WHERE id = ANY($1::integer[]) ORDER BY id FOR UPDATE`,
      [productoIds],
    );
    const productosPorId = new Map(productos.map((producto) => [producto.id, producto]));
    let total = 0;
    const itemsPedido = itemsCarrito.map((item) => {
      const producto = productosPorId.get(item.producto_id);
      if (!producto || !producto.activo) {
        throw new ConflictError("un producto del carrito no está disponible");
      }
      if (producto.stock < item.cantidad) {
        throw new ConflictError("stock insuficiente para confirmar el pedido");
      }
      const subtotal = producto.precio * item.cantidad;
      total += subtotal;
      return { ...item, nombre: producto.nombre, precio: producto.precio, subtotal };
    });

    const { rows: pedidos } = await client.query(
      `INSERT INTO pedido (usuario_id, direccion_id, estado, metodo_pago, total)
       VALUES ($1, $2, 'realizado', $3, $4)
       RETURNING id, usuario_id, fecha_creacion, estado, metodo_pago, total`,
      [usuarioId, direccionId, metodoPago, total],
    );
    const pedido = pedidos[0];
    const itemsRespuesta = [];

    for (const item of itemsPedido) {
      const { rows } = await client.query(
        `INSERT INTO pedido_item
           (pedido_id, producto_id, nombre_producto, cantidad, precio_unitario)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, producto_id, nombre_producto, cantidad, precio_unitario`,
        [pedido.id, item.producto_id, item.nombre, item.cantidad, item.precio],
      );
      itemsRespuesta.push({
        id: rows[0].id,
        productoId: rows[0].producto_id,
        nombreProducto: rows[0].nombre_producto,
        cantidad: rows[0].cantidad,
        precioUnitario: rows[0].precio_unitario,
        subtotal: item.subtotal,
      });
    }

    for (const item of itemsPedido) {
      const { rows } = await client.query(
        `UPDATE producto SET stock = stock - $1
         WHERE id = $2 AND activo = TRUE AND stock >= $1
         RETURNING id`,
        [item.cantidad, item.producto_id],
      );
      if (!rows[0]) {
        throw new ConflictError("stock insuficiente para confirmar el pedido");
      }
    }

    await client.query(
      `INSERT INTO pedido_estado_historial (pedido_id, estado, usuario_id)
       VALUES ($1, 'realizado', $2)`,
      [pedido.id, usuarioId],
    );
    await client.query("DELETE FROM carrito_item WHERE carrito_id = $1", [carritoId]);
    await client.query(
      "UPDATE carrito SET fecha_actualizacion = now() WHERE id = $1",
      [carritoId],
    );

    await client.query("COMMIT");
    transactionStarted = false;

    return {
      id: pedido.id,
      usuarioId: pedido.usuario_id,
      direccion: {
        id: direcciones[0].id,
        usuarioId: direcciones[0].usuario_id,
        calle: direcciones[0].calle,
        numero: direcciones[0].numero,
        ciudad: direcciones[0].ciudad,
        referencia: direcciones[0].referencia,
        esPredeterminada: false,
      },
      items: itemsRespuesta,
      estado: pedido.estado,
      metodoPago: pedido.metodo_pago,
      total: pedido.total,
      fechaCreacion: pedido.fecha_creacion.toISOString(),
    };
  } catch (error) {
    if (transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        app.log.error({ err: rollbackError }, "falló el rollback del checkout");
      }
    }
    throw error;
  } finally {
    client.release();
  }
}
