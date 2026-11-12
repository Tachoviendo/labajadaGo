import {
  ProductCreateBody,
  ProductUpdateBody,
  ProductFiltersQuery,
  ProductSchema,
  IdParam,
  paginated,
} from "../../schemas/index.js";
import { ErrorResponseSchema } from "../../schemas/errors.schema.js";
import * as productsService from "../../services/products.service.js";
import * as bucketService from "../../services/bucket.service.js";
import fastifyMultipart from "@fastify/multipart";
import {
  BadRequestError,
  PayloadTooLargeError,
} from "../../errors/response.errors.js";

const MAX_IMAGEN_BYTES = 2 * 1024 * 1024;

//firma de los primeros bytes de cada formato aceptado: no alcanza con el
//content-type que manda el cliente, se chequea que el archivo lo sea de verdad
const FIRMAS_IMAGEN = {
  "image/jpeg": (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "image/png": (b) =>
    b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  "image/webp": (b) =>
    b.length > 12 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP",
};

export default async function productRoutes(app) {
  //multipart solo hace falta para subir imagenes, queda encapsulado en estas rutas
  await app.register(fastifyMultipart, {
    limits: { fileSize: MAX_IMAGEN_BYTES, files: 1 },
  });

  //listar y filtrar productos - publica
  app.get(
    "/productos",
    {
      preHandler: async (request, reply) => {
        if (request.query.activo === false) {
          await app.authenticate(request, reply);
          await app.authorize("dueno")(request, reply);
        }
      },
      schema: {
        querystring: ProductFiltersQuery,
        response: {
          200: paginated(ProductSchema),
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
        },
      },
    },
    async (request) => {
      return productsService.listar(app, request.query);
    },
  );

  //obtener producto por id - publica
  app.get(
    "/productos/:id",
    {
      schema: {
        params: IdParam,
        response: {
          200: ProductSchema,
        },
      },
    },
    async (request) => {
      return productsService.obtener(app, request.params.id);
    },
  );

  //crear producto - solo dueño
  app.post(
    "/productos",
    {
      preHandler: [app.authenticate, app.authorize("dueno")],
      schema: {
        security: [{ bearerAuth: [] }],
        body: ProductCreateBody,
        response: {
          201: ProductSchema,
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const producto = await productsService.crear(app, request.body);

      return reply.code(201).send(producto);
    },
  );

  //modificar producto - solo dueño
  app.patch(
    "/productos/:id",
    {
      preHandler: [app.authenticate, app.authorize("dueno")],
      schema: {
        security: [{ bearerAuth: [] }],
        params: IdParam,
        body: ProductUpdateBody,
        response: {
          200: ProductSchema,
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
        },
      },
    },
    async (request) => {
      const { id } = request.params;

      return productsService.actualizar(app, id, request.body);
    },
  );

  //subir o reemplazar la imagen de un producto - solo dueño.
  //recibe multipart/form-data con un campo "file" (jpeg, png o webp, hasta 2 MB),
  //lo guarda en el bucket y deja la url publica en producto.imagen_url
  app.post(
    "/productos/:id/imagen",
    {
      preHandler: [app.authenticate, app.authorize("dueno")],
      schema: {
        security: [{ bearerAuth: [] }],
        consumes: ["multipart/form-data"],
        params: IdParam,
        response: {
          200: ProductSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
          404: ErrorResponseSchema,
          413: ErrorResponseSchema,
        },
      },
    },
    async (request) => {
      const { id } = request.params;

      //si el producto no existe se corta antes de subir nada al bucket
      await productsService.obtener(app, id);

      if (!request.isMultipart()) {
        throw new BadRequestError("enviá la imagen como multipart/form-data en el campo 'file'");
      }

      const data = await request.file();
      if (!data) {
        throw new BadRequestError("no se envió ninguna imagen");
      }

      const firmaValida = FIRMAS_IMAGEN[data.mimetype];
      if (!firmaValida) {
        data.file.resume();
        throw new BadRequestError("solo se aceptan imágenes jpeg, png o webp");
      }

      let buffer;
      try {
        buffer = await data.toBuffer();
      } catch (error) {
        if (error.code === "FST_REQ_FILE_TOO_LARGE") {
          throw new PayloadTooLargeError("la imagen supera los 2 MB");
        }
        throw error;
      }

      if (!firmaValida(buffer)) {
        throw new BadRequestError("el archivo no es una imagen válida del tipo indicado");
      }

      const imagenUrl = await bucketService.subirImagen(buffer, data.mimetype, data.filename);

      return productsService.actualizar(app, id, { imagenUrl });
    },
  );

  //desactivar producto - solo dueño
  app.delete(
    "/productos/:id",
    {
      preHandler: [app.authenticate, app.authorize("dueno")],
      schema: {
        security: [{ bearerAuth: [] }],
        params: IdParam,
        response: {
          204: { type: "null" },
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      await productsService.desactivar(app, id);

      return reply.code(204).send();
    },
  );
}
