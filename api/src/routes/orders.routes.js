import {
  CreateOrderBody,
  OrderSchema,
  OrderFiltersQuery,
  OrderStatusChangeBody,
  IdParam,
} from "../../schemas/index.js";
import { ErrorResponseSchema } from "../../schemas/errors.schema.js";
import * as ordersService from "../../services/orders.service.js";

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
    async (request) =>
      ordersService.listForUser(app, request.user, request.query),
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
          404: ErrorResponseSchema,
          409: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const pedido = await ordersService.createFromCart(
        app,
        request.user.id,
        request.body,
      );
      return reply.code(201).send(pedido);
    },
  );

  //obtener pedido - cualquier rol logueado, cliente solo el suyo
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
          404: ErrorResponseSchema,
        },
      },
    },
    async (request) =>
      ordersService.getById(app, request.params.id, request.user),
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
          404: ErrorResponseSchema,
          409: ErrorResponseSchema,
        },
      },
    },
    async (request) => {
      await ordersService.changeStatus(
        app,
        request.params.id,
        request.user.id,
        request.body.estado,
      );
      return ordersService.getById(app, request.params.id, request.user);
    },
  );

  //cancelar pedido - cliente logueado, solo su propio pedido
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
          404: ErrorResponseSchema,
          409: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      await ordersService.cancelByUser(app, request.params.id, request.user.id);
      return reply.code(204).send();
    },
  );
}
