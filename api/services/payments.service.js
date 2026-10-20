import { ConflictError, ForbiddenError, NotFoundError } from "../errors/response.errors.js";

function mapPayment(payment) {
  return {
    id: payment.id,
    pedidoId: payment.pedido_id,
    metodo: payment.metodo,
    estado: payment.estado,
    referenciaExterna: payment.referencia_externa,
    fechaPago: payment.fecha_pago?.toISOString() ?? null,
    registradoPor: payment.registrado_por,
  };
}

export async function getById(app, pagoId, usuario) {
  const client = await app.pg.connect();
  try {
    const { rows } = await client.query(
      `SELECT pago.id, pago.pedido_id, pago.metodo, pago.estado,
              pago.referencia_externa, pago.fecha_pago, pago.registrado_por,
              pedido.usuario_id AS pedido_usuario_id
       FROM pago JOIN pedido ON pedido.id = pago.pedido_id
       WHERE pago.id = $1`,
      [pagoId],
    );
    const payment = rows[0];
    if (!payment) throw new NotFoundError("el pago no existe");
    if (usuario.rol === "cliente" && payment.pedido_usuario_id !== usuario.id) {
      throw new ForbiddenError("el pago pertenece a un pedido de otro usuario");
    }
    return mapPayment(payment);
  } finally {
    client.release();
  }
}

export async function registerPos(app, pagoId, actorId, { referenciaExterna }) {
  const client = await app.pg.connect();
  let transactionStarted = false;
  try {
    await client.query("BEGIN");
    transactionStarted = true;
    const { rows: refs } = await client.query(
      "SELECT pedido_id FROM pago WHERE id = $1",
      [pagoId],
    );
    if (!refs[0]) throw new NotFoundError("el pago no existe");

    const { rows: orders } = await client.query(
      "SELECT id, metodo_pago, estado FROM pedido WHERE id = $1 FOR UPDATE",
      [refs[0].pedido_id],
    );
    if (!orders[0]) throw new NotFoundError("el pedido del pago no existe");

    const { rows: payments } = await client.query(
      `SELECT id, pedido_id, metodo, estado, referencia_externa, fecha_pago, registrado_por
       FROM pago WHERE id = $1 FOR UPDATE`,
      [pagoId],
    );
    const payment = payments[0];
    if (!payment) throw new NotFoundError("el pago no existe");
    if (payment.metodo !== "pos" || orders[0].metodo_pago !== "pos") {
      throw new ConflictError("el pedido no corresponde a un pago POS");
    }
    if (orders[0].estado !== "entregado") {
      throw new ConflictError("el pago POS se registra al entregar el pedido");
    }
    if (payment.estado === "pagado") {
      throw new ConflictError("el pago ya está registrado");
    }
    if (!["pendiente", "rechazado"].includes(payment.estado)) {
      throw new ConflictError("el estado actual del pago no permite registrarlo");
    }

    const { rows: updated } = await client.query(
      `UPDATE pago SET estado = 'pagado', fecha_pago = now(),
                       referencia_externa = $1, registrado_por = $2
       WHERE id = $3 AND estado IN ('pendiente', 'rechazado')
       RETURNING id, pedido_id, metodo, estado, referencia_externa,
                 fecha_pago, registrado_por`,
      [referenciaExterna ?? null, actorId, pagoId],
    );
    if (!updated[0]) throw new ConflictError("el pago cambió mientras se registraba");
    await client.query("COMMIT");
    transactionStarted = false;
    return mapPayment(updated[0]);
  } catch (error) {
    if (transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        app.log.error({ err: rollbackError }, "falló el rollback del pago POS");
      }
    }
    throw error;
  } finally {
    client.release();
  }
}
