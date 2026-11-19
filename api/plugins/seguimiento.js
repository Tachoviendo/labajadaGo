import fp from "fastify-plugin";
import fastifyWebsocket from "@fastify/websocket";

//sala por pedido: las conexiones websocket (cliente y repartidor) que estan mirando
//un pedido. vive en memoria: alcanza con una sola instancia de la api
export function crearHubSeguimiento() {
  const salas = new Map();

  return {
    unir(pedidoId, socket) {
      if (!salas.has(pedidoId)) salas.set(pedidoId, new Set());
      salas.get(pedidoId).add(socket);
    },

    salir(pedidoId, socket) {
      const sala = salas.get(pedidoId);
      if (!sala) return;
      sala.delete(socket);
      if (sala.size === 0) salas.delete(pedidoId);
    },

    //manda el mensaje a todos los que miran el pedido
    publicar(pedidoId, mensaje) {
      const sala = salas.get(pedidoId);
      if (!sala) return 0;
      const texto = JSON.stringify(mensaje);
      for (const socket of sala) {
        if (socket.readyState === socket.OPEN) socket.send(texto);
      }
      return sala.size;
    },

    conectados(pedidoId) {
      return salas.get(pedidoId)?.size ?? 0;
    },
  };
}

//avisa a los que miran el pedido que cambio de estado (recogido, entregado, vuelto a preparar).
//si el plugin no esta registrado (por ejemplo en algunos tests) no hace nada
export function avisarEstado(app, pedido) {
  if (!app.hasDecorator("seguimiento")) return;
  app.seguimiento.publicar(pedido.id, {
    tipo: "estado",
    pedidoId: pedido.id,
    estado: pedido.estado,
    repartidorId: pedido.repartidorId ?? null,
    fotoEntregaUrl: pedido.fotoEntregaUrl ?? null,
  });
}

//habilita websockets en la api (los mensajes son chicos: tope de 1 KB) y deja
//app.seguimiento disponible en toda la api (las rutas de repartos avisan los
//cambios de estado por aca). se registra antes que las rutas
export default fp(async (fastify) => {
  await fastify.register(fastifyWebsocket, { options: { maxPayload: 1024 } });
  fastify.decorate("seguimiento", crearHubSeguimiento());
});
