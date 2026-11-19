import { ForbiddenError, NotFoundError } from "../errors/response.errors.js";

//plaza Artigas, Salto. se usa si el .env no trae LOCAL_LAT/LOCAL_LNG
const LOCAL_POR_DEFECTO = { lat: -31.38876, lng: -57.96062 };

//origen de todos los repartos: el local
export function ubicacionLocal() {
  const lat = Number.parseFloat(process.env.LOCAL_LAT);
  const lng = Number.parseFloat(process.env.LOCAL_LNG);
  if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  return LOCAL_POR_DEFECTO;
}

//el seguimiento (mapa, recorrido, websocket) es solo del cliente que hizo el pedido
//y del repartidor que lo lleva
export async function verificarAcceso(app, pedidoId, usuario) {
  const { rows } = await app.pg.query(
    `SELECT id, usuario_id, estado, repartidor_id, direccion_lat, direccion_lng,
            foto_entrega_url
     FROM pedido WHERE id = $1`,
    [pedidoId],
  );
  const pedido = rows[0];
  if (!pedido) throw new NotFoundError("el pedido no existe");

  const esCliente = usuario.rol === "cliente" && pedido.usuario_id === usuario.id;
  const esRepartidor = usuario.rol === "repartidor" && pedido.repartidor_id === usuario.id;
  if (!esCliente && !esRepartidor) {
    throw new ForbiddenError("solo el cliente del pedido y su repartidor pueden seguirlo");
  }
  return { pedido, rol: esCliente ? "cliente" : "repartidor" };
}

//guarda un punto del recorrido. el WHERE hace de candado: solo entra si el pedido sigue
//en reparto y es de ese repartidor. devuelve la fecha guardada o null si no correspondia
export async function guardarUbicacion(app, pedidoId, repartidorId, { lat, lng }) {
  const { rows } = await app.pg.query(
    `INSERT INTO pedido_ubicacion (pedido_id, lat, lng)
     SELECT $1, $2, $3
     WHERE EXISTS (
       SELECT 1 FROM pedido
       WHERE id = $1 AND estado = 'en_reparto' AND repartidor_id = $4
     )
     RETURNING fecha`,
    [pedidoId, lat, lng, repartidorId],
  );
  return rows[0]?.fecha ?? null;
}

//todo lo que necesita el mapa: origen (local), destino (casa del cliente) y los puntos
export async function obtenerRecorrido(app, pedidoId, usuario) {
  const { pedido } = await verificarAcceso(app, pedidoId, usuario);
  const { rows } = await app.pg.query(
    `SELECT lat, lng, fecha FROM pedido_ubicacion
     WHERE pedido_id = $1
     ORDER BY fecha, id`,
    [pedidoId],
  );

  return {
    pedidoId: pedido.id,
    estado: pedido.estado,
    origen: ubicacionLocal(),
    destino:
      pedido.direccion_lat == null || pedido.direccion_lng == null
        ? null
        : { lat: pedido.direccion_lat, lng: pedido.direccion_lng },
    puntos: rows.map((punto) => ({
      lat: punto.lat,
      lng: punto.lng,
      fecha: punto.fecha.toISOString(),
    })),
  };
}
