import {
  CreateOrderBody,
  OrderSchema,
  OrderFiltersQuery,
  OrderStatusChangeBody,
  IdParam,
} from "../../schemas/index.js";
import { ErrorResponseSchema } from "../../schemas/errors.schema.js";

export default async function orderRoutes(app) {
  //listar pedidos - cualquier rol logueado (el alcance cambia segun el rol, eso se resuelve en el service)
  app.get(
    "/pedidos",
    {
      preHandler: [app.authenticate],
      schema: {
        security: [{ bearerAuth: [] }],
        querystring: OrderFiltersQuery,
        response: {
          200: {
            type: "array",
            items: OrderSchema,
          },
          401: ErrorResponseSchema,
        },
      },
    },
    async (request) => {
      return {
        message: "Listar pedidos",
        query: request.query,
      };
    },
  );

  //crear pedido - cliente logueado (checkout)
  app.post(
    "/pedidos",
    {
      preHandler: [app.authenticate, app.authorize("cliente")],
      schema: {
        security: [{ bearerAuth: [] }],
        body: CreateOrderBody,
        response: {
          201: OrderSchema,
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

  //obtener pedido - cualquier rol logueado, cliente solo el suyo (ownership: implementar cuando haya service real)
  app.get(
    "/pedidos/:id",
    {
      preHandler: [app.authenticate],
      schema: {
        security: [{ bearerAuth: [] }],
        params: IdParam,
        response: {
          200: OrderSchema,
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

  //cambiar estado del pedido - cajero o dueño
  app.patch(
    "/pedidos/:id/estado",
    {
      preHandler: [app.authenticate, app.authorize("cajero", "dueno")],
      schema: {
        security: [{ bearerAuth: [] }],
        params: IdParam,
        body: OrderStatusChangeBody,
        response: {
          200: OrderSchema,
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

  //cancelar pedido - cliente logueado, solo su propio pedido (ownership: implementar cuando haya service real)
  app.delete(
    "/pedidos/:id",
    {
      preHandler: [app.authenticate, app.authorize("cliente")],
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

      console.log(`Cancelando pedido ${id}`);

      return reply.code(204).send();
    },
  );
}