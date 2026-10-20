import {
  CartSchema,
  CartItemSchema,
  AddCartItemBody,
  UpdateCartItemBody,
} from "../../schemas/index.js";
import { ErrorResponseSchema } from "../../schemas/errors.schema.js";
import * as cartService from "../../services/cart.service.js";

export default async function cartRoutes(app) {
  //obtener carrito
  app.get(
    "/carrito",
    {
      preHandler: [app.authenticate, app.authorize("cliente")],
      schema: {
        security: [{ bearerAuth: [] }],
        response: {
          200: CartSchema,
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
        },
      },
    },
    async (request) => cartService.getForUser(app, request.user.id),
  );

  //agregar producto al carrito
  app.post(
    "/carrito/items",
    {
      preHandler: [app.authenticate, app.authorize("cliente")],
      schema: {
        security: [{ bearerAuth: [] }],
        body: AddCartItemBody,
        response: {
          201: CartItemSchema,
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
          404: ErrorResponseSchema,
          409: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const item = await cartService.addItem(app, request.user.id, request.body);
      return reply.code(201).send(item);
    },
  );

  //modificar cantidad
  app.patch(
    "/carrito/items/:productoId",
    {
      preHandler: [app.authenticate, app.authorize("cliente")],
      schema: {
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: { productoId: { type: "integer", minimum: 1 } },
          required: ["productoId"],
          additionalProperties: false,
        },
        body: UpdateCartItemBody,
        response: {
          200: CartItemSchema,
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
          404: ErrorResponseSchema,
          409: ErrorResponseSchema,
        },
      },
    },
    async (request) =>
      cartService.updateItem(
        app,
        request.user.id,
        request.params.productoId,
        request.body.cantidad,
      ),
  );

  //eliminar producto del carrito
  app.delete(
    "/carrito/items/:productoId",
    {
      preHandler: [app.authenticate, app.authorize("cliente")],
      schema: {
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: { productoId: { type: "integer", minimum: 1 } },
          required: ["productoId"],
          additionalProperties: false,
        },
        response: {
          204: { type: "null" },
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      await cartService.removeItem(app, request.user.id, request.params.productoId);
      return reply.code(204).send();
    },
  );
}
