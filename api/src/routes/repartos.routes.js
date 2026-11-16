import fastifyMultipart from "@fastify/multipart";
import { IdParam, OrderSchema } from "../../schemas/index.js";
import { ErrorResponseSchema } from "../../schemas/errors.schema.js";
import * as repartosService from "../../services/repartos.service.js";
import * as bucketService from "../../services/bucket.service.js";
import { leerImagenSubida } from "../../services/imagen.service.js";

//las fotos del celular pesan mas que las imagenes de productos
const MAX_FOTO_MB = 5;

//flujo del repartidor: ver pedidos listos, recoger uno (sale a reparto) y entregarlo con foto.
//sus repartos asignados los lista GET /pedidos (filtrado por repartidor en el service)
export default async function repartosRoutes(app) {
  await app.register(fastifyMultipart, {
    limits: { fileSize: MAX_FOTO_MB * 1024 * 1024, files: 1 },
  });

  const soloRepartidor = [app.authenticate, app.authorize("repartidor")];

  app.get(
    "/repartos/disponibles",
    {
      preHandler: soloRepartidor,
      schema: {
        security: [{ bearerAuth: [] }],
        response: {
          200: { type: "array", items: OrderSchema },
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
        },
      },
    },
    async () => repartosService.listarDisponibles(app),
  );

  app.post(
    "/pedidos/:id/recoger",
    {
      preHandler: soloRepartidor,
      schema: {
        security: [{ bearerAuth: [] }],
        params: IdParam,
        response: {
          200: OrderSchema,
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
          404: ErrorResponseSchema,
          409: ErrorResponseSchema,
        },
      },
    },
    async (request) => repartosService.recoger(app, request.params.id, request.user),
  );

  //multipart/form-data con la foto en el campo "file" (jpeg, png o webp, hasta 5 MB)
  app.post(
    "/pedidos/:id/entregar",
    {
      preHandler: soloRepartidor,
      schema: {
        security: [{ bearerAuth: [] }],
        consumes: ["multipart/form-data"],
        params: IdParam,
        response: {
          200: OrderSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
          404: ErrorResponseSchema,
          409: ErrorResponseSchema,
          413: ErrorResponseSchema,
        },
      },
    },
    async (request) => {
      const { id } = request.params;
      await repartosService.verificarEntregable(app, id, request.user);

      const { buffer, mimetype, filename } = await leerImagenSubida(request, {
        maxMb: MAX_FOTO_MB,
      });
      const fotoUrl = await bucketService.subirImagen(buffer, mimetype, filename);

      return repartosService.entregar(app, id, request.user, fotoUrl);
    },
  );
}
