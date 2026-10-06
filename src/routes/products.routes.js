import {
  ProductCreateBody,
  ProductUpdateBody,
  ProductFiltersQuery,
  ProductSchema,
  IdParam,
} from "../../schemas/index.js";
import { ErrorResponseSchema } from "../../schemas/errors.schema.js";

export default async function productRoutes(app) {
  //listar y filtrar productos - publica
  app.get(
    "/productos",
    {
      schema: {
        querystring: ProductFiltersQuery,
        response: {
          200: {
            type: "array",
            items: ProductSchema,
          },
        },
      },
    },
    async (request) => {
      return {
        message: "Listar productos",
        query: request.query,
      };
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
      const { id } = request.params;

      return {
        id: Number(id),
      };
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
    async () => {
      return {
        id: 1,
      };
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

      return {
        id: Number(id),
      };
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

      console.log(`Desactivando producto ${id}`);

      return reply.code(204).send();
    },
  );
}