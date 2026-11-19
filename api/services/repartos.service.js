import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "../errors/response.errors.js";
import {
  getById,
  loadItems,
  mapOrder,
  orderColumns,
  withOrderTransaction,
} from "./orders.service.js";

//pedidos listos para salir: preparando y sin repartidor, los mas viejos primero
export async function listarDisponibles(app) {
  const client = await app.pg.connect();
  try {
    const { rows } = await client.query(
      `SELECT ${orderColumns}
       FROM pedido p
       WHERE p.estado = 'preparando' AND p.repartidor_id IS NULL
       ORDER BY p.fecha_creacion ASC, p.id ASC`,
    );
    return Promise.all(rows.map(async (order) => mapOrder(order, await loadItems(client, order.id))));
  } finally {
    client.release();
  }
}

//"recogí el pedido": el repartidor lo toma y sale a reparto. desde aca empieza el seguimiento
export async function recoger(app, pedidoId, repartidor) {
  await withOrderTransaction(app, async (client) => {
    //un reparto a la vez: el mapa y la ubicacion son de un solo pedido
    const { rows: activos } = await client.query(
      `SELECT id FROM pedido
       WHERE repartidor_id = $1 AND estado = 'en_reparto'
       LIMIT 1`,
      [repartidor.id],
    );
    if (activos[0] && activos[0].id !== pedidoId) {
      throw new ConflictError(`ya tenés el pedido ${activos[0].id} en reparto; entregalo primero`);
    }

    const { rows: pedidos } = await client.query(
      `SELECT id, estado, repartidor_id FROM pedido WHERE id = $1 FOR UPDATE`,
      [pedidoId],
    );
    const pedido = pedidos[0];
    if (!pedido) throw new NotFoundError("el pedido no existe");
    if (pedido.repartidor_id !== null && pedido.repartidor_id !== repartidor.id) {
      throw new ConflictError("el pedido ya lo recogió otro repartidor");
    }
    if (pedido.estado !== "preparando") {
      throw new ConflictError("solo se pueden recoger pedidos que están en preparación");
    }

    await client.query(
      `UPDATE pedido SET estado = 'en_reparto', repartidor_id = $1 WHERE id = $2`,
      [repartidor.id, pedidoId],
    );
    await client.query(
      `INSERT INTO pedido_estado_historial (pedido_id, estado, usuario_id)
       VALUES ($1, 'en_reparto', $2)`,
      [pedidoId, repartidor.id],
    );
  });

  return getById(app, pedidoId, repartidor);
}

//chequeo previo a subir la foto, para no dejar archivos sueltos en el bucket
//si el pedido no se puede entregar
export async function verificarEntregable(app, pedidoId, repartidor) {
  const { rows } = await app.pg.query(
    `SELECT id, estado, repartidor_id FROM pedido WHERE id = $1`,
    [pedidoId],
  );
  const pedido = rows[0];
  if (!pedido) throw new NotFoundError("el pedido no existe");
  if (pedido.repartidor_id !== repartidor.id) {
    throw new ForbiddenError("el pedido no está asignado a vos");
  }
  if (pedido.estado !== "en_reparto") {
    throw new ConflictError("solo se pueden entregar pedidos que están en reparto");
  }
}

//"entregado": guarda la foto, cierra el pedido y, si se paga con POS, deja el pago
//registrado por el repartidor (cobra en la puerta)
export async function entregar(app, pedidoId, repartidor, fotoUrl) {
  await withOrderTransaction(app, async (client) => {
    const { rows } = await client.query(
      `UPDATE pedido SET estado = 'entregado', foto_entrega_url = $1
       WHERE id = $2 AND estado = 'en_reparto' AND repartidor_id = $3
       RETURNING id, metodo_pago`,
      [fotoUrl, pedidoId, repartidor.id],
    );
    if (!rows[0]) throw new ConflictError("el pedido cambió mientras se entregaba");

    await client.query(
      `INSERT INTO pedido_estado_historial (pedido_id, estado, usuario_id)
       VALUES ($1, 'entregado', $2)`,
      [pedidoId, repartidor.id],
    );

    if (rows[0].metodo_pago === "pos") {
      await client.query(
        `UPDATE pago SET estado = 'pagado', fecha_pago = now(), registrado_por = $2
         WHERE pedido_id = $1 AND metodo = 'pos' AND estado IN ('pendiente', 'rechazado')`,
        [pedidoId, repartidor.id],
      );
    }
  });

  return getById(app, pedidoId, repartidor);
}
