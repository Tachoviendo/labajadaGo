import { Type } from "@fastify/type-provider-typebox";
import { IdParam } from "../../schemas/index.js";
import { ErrorResponseSchema } from "../../schemas/errors.schema.js";
import * as seguimientoService from "../../services/seguimiento.service.js";

//codigos de cierre propios (4000-4999 son libres para la aplicacion)
const CIERRE = {
  sinLogin: 4401,
  prohibido: 4403,
  noExiste: 4404,
  error: 4500,
};

const ESPERA_LOGIN_MS = 5000;
//el celular manda cada ~5 s; si manda mas seguido se ignoran los puntos de mas
const MINIMO_ENTRE_PUNTOS_MS = 2000;

const Punto = Type.Object({
  lat: Type.Number(),
  lng: Type.Number(),
});

const RecorridoSchema = Type.Object({
  pedidoId: Type.Integer(),
  estado: Type.String(),
  origen: Punto,
  destino: Type.Union([Punto, Type.Null()]),
  puntos: Type.Array(
    Type.Object({
      lat: Type.Number(),
      lng: Type.Number(),
      fecha: Type.String({ format: "date-time" }),
    }),
  ),
});

function coordenadaValida(valor, limite) {
  return typeof valor === "number" && Number.isFinite(valor) && Math.abs(valor) <= limite;
}

function enviar(socket, mensaje) {
  if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(mensaje));
}

function cerrarConError(socket, codigo, mensaje) {
  enviar(socket, { tipo: "error", mensaje });
  socket.close(codigo, mensaje.slice(0, 120));
}

//seguimiento en vivo del reparto.
//  1. el cliente abre ws://.../api/pedidos/:id/seguimiento
//  2. primer mensaje: { tipo: "auth", token } (el navegador no deja mandar headers en un websocket,
//     y en la url quedaria en los logs)
//  3. el servidor responde { tipo: "listo", pedidoId, estado, rol }
//  4. el repartidor manda { tipo: "ubicacion", lat, lng }; se guarda y le llega a todos como
//     { tipo: "ubicacion", pedidoId, lat, lng, fecha }
//  5. los cambios de estado (recoger, entregar) llegan como { tipo: "estado", estado, ... }
//necesita el plugin plugins/seguimiento.js registrado antes (websocket + sala por pedido)
export default async function seguimientoRoutes(app) {
  app.get(
    "/pedidos/:id/seguimiento",
    { websocket: true, schema: { params: IdParam, hide: true } },
    (socket, request) => {
      const pedidoId = request.params.id;
      let usuario = null;
      let autenticando = null;
      let rol = null;
      let ultimoPunto = 0;
      let enSala = false;

      const esperaLogin = setTimeout(() => {
        if (!usuario) cerrarConError(socket, CIERRE.sinLogin, "no se recibió el token a tiempo");
      }, ESPERA_LOGIN_MS);

      socket.on("close", () => {
        clearTimeout(esperaLogin);
        if (enSala) app.seguimiento.salir(pedidoId, socket);
      });

      //los handlers se registran en forma sincronica para no perder el primer mensaje
      socket.on("message", async (crudo) => {
        let mensaje;
        try {
          mensaje = JSON.parse(crudo.toString());
        } catch {
          enviar(socket, { tipo: "error", mensaje: "el mensaje no es JSON válido" });
          return;
        }

        try {
          if (!usuario) {
            //si llega otro mensaje mientras se valida el login, espera a que termine
            if (autenticando) {
              await autenticando;
              if (!usuario) return;
            } else {
              autenticando = autenticar(mensaje);
              await autenticando;
              return;
            }
          }
          if (mensaje?.tipo === "ubicacion") {
            await recibirUbicacion(mensaje);
            return;
          }
          enviar(socket, { tipo: "error", mensaje: "tipo de mensaje desconocido" });
        } catch (error) {
          request.log.error({ err: error }, "falló el seguimiento del pedido");
          cerrarConError(socket, CIERRE.error, "error interno del seguimiento");
        }
      });

      async function autenticar(mensaje) {
        if (mensaje?.tipo !== "auth" || typeof mensaje.token !== "string") {
          cerrarConError(socket, CIERRE.sinLogin, "el primer mensaje tiene que ser { tipo: 'auth', token }");
          return;
        }

        let payload;
        try {
          payload = app.jwt.verify(mensaje.token);
        } catch {
          cerrarConError(socket, CIERRE.sinLogin, "token ausente o inválido");
          return;
        }

        try {
          const acceso = await seguimientoService.verificarAcceso(app, pedidoId, payload);
          clearTimeout(esperaLogin);
          usuario = payload;
          rol = acceso.rol;
          app.seguimiento.unir(pedidoId, socket);
          enSala = true;
          enviar(socket, { tipo: "listo", pedidoId, estado: acceso.pedido.estado, rol });
        } catch (error) {
          if (error.statusCode === 404) {
            cerrarConError(socket, CIERRE.noExiste, "el pedido no existe");
          } else if (error.statusCode === 403) {
            cerrarConError(socket, CIERRE.prohibido, "no podés seguir este pedido");
          } else {
            throw error;
          }
        }
      }

      async function recibirUbicacion({ lat, lng }) {
        if (rol !== "repartidor") {
          enviar(socket, { tipo: "error", mensaje: "solo el repartidor manda su ubicación" });
          return;
        }
        if (!coordenadaValida(lat, 90) || !coordenadaValida(lng, 180)) {
          enviar(socket, { tipo: "error", mensaje: "lat y lng tienen que ser números válidos" });
          return;
        }
        const ahora = Date.now();
        if (ahora - ultimoPunto < MINIMO_ENTRE_PUNTOS_MS) return;
        ultimoPunto = ahora;

        const fecha = await seguimientoService.guardarUbicacion(app, pedidoId, usuario.id, { lat, lng });
        if (!fecha) {
          enviar(socket, { tipo: "error", mensaje: "el pedido ya no está en reparto" });
          return;
        }
        app.seguimiento.publicar(pedidoId, {
          tipo: "ubicacion",
          pedidoId,
          lat,
          lng,
          fecha: fecha.toISOString(),
        });
      }
    },
  );

  //recorrido completo para dibujar el mapa al abrirlo (y despues de entregado)
  app.get(
    "/pedidos/:id/recorrido",
    {
      preHandler: [app.authenticate],
      schema: {
        security: [{ bearerAuth: [] }],
        params: IdParam,
        response: {
          200: RecorridoSchema,
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request) => seguimientoService.obtenerRecorrido(app, request.params.id, request.user),
  );
}
