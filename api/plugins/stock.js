import fp from "fastify-plugin";
import fastifyWebsocket from "@fastify/websocket";

//cada cuanto se manda un ping a los conectados: mantiene viva la conexion aunque no haya
//cambios de stock (proxies y redes moviles cortan los websockets que quedan callados)
const PING_MS = 30_000;

//conexiones websocket que estan mirando el stock (catalogo, detalle, panel del dueño).
//a diferencia del seguimiento no hay salas: el stock es publico y le llega a todos.
//vive en memoria: alcanza con una sola instancia de la api
export function crearHubStock() {
  const sockets = new Set();

  const ping = setInterval(() => {
    for (const socket of sockets) {
      if (socket.readyState === socket.OPEN) socket.ping();
    }
  }, PING_MS);
  ping.unref();

  return {
    unir(socket) {
      sockets.add(socket);
    },

    salir(socket) {
      sockets.delete(socket);
    },

    //manda el mensaje a todos los conectados
    publicar(mensaje) {
      const texto = JSON.stringify(mensaje);
      for (const socket of sockets) {
        if (socket.readyState === socket.OPEN) socket.send(texto);
      }
      return sockets.size;
    },

    conectados() {
      return sockets.size;
    },

    cerrar() {
      clearInterval(ping);
    },
  };
}

//manda el stock actual de esos productos: { tipo: "stock", productos: [{ id, stock }] }.
//se lee de la base (no se calcula en la api) porque el stock lo mueven los triggers
//de db/02_triggers.sql al confirmar y al cancelar pedidos.
//se llama despues de que la operacion termino bien; si falla solo se loguea, el pedido
//o el producto ya quedaron guardados y no tiene sentido devolverle un error al usuario
export async function avisarStock(app, productoIds) {
  if (!app.hasDecorator("stock")) return;
  const ids = [...new Set(productoIds)].filter(Number.isInteger);
  if (ids.length === 0 || app.stock.conectados() === 0) return;
  try {
    const { rows } = await app.pg.query(
      `SELECT id, stock FROM producto WHERE id = ANY($1::int[]) ORDER BY id`,
      [ids],
    );
    if (rows.length > 0) app.stock.publicar({ tipo: "stock", productos: rows });
  } catch (error) {
    app.log.error({ err: error }, "no se pudo avisar el cambio de stock");
  }
}

//stock de los productos de un pedido (al confirmarlo o cancelarlo)
export async function avisarStockDePedido(app, pedidoId) {
  if (!app.hasDecorator("stock") || app.stock.conectados() === 0) return;
  try {
    const { rows } = await app.pg.query(
      `SELECT DISTINCT producto_id FROM pedido_item WHERE pedido_id = $1`,
      [pedidoId],
    );
    await avisarStock(
      app,
      rows.map((row) => row.producto_id),
    );
  } catch (error) {
    app.log.error({ err: error }, "no se pudo avisar el cambio de stock del pedido");
  }
}

//deja app.stock disponible en toda la api. usa el soporte de websockets de
//@fastify/websocket: si ya lo registro el plugin de seguimiento no se vuelve a registrar
export default fp(async (fastify) => {
  if (!fastify.hasDecorator("websocketServer")) {
    await fastify.register(fastifyWebsocket, { options: { maxPayload: 1024 } });
  }
  const hub = crearHubStock();
  fastify.decorate("stock", hub);
  fastify.addHook("onClose", async () => hub.cerrar());
});
