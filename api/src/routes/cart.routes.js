import {
  CartSchema,
  CartItemSchema,
  AddCartItemBody,
  UpdateCartItemBody,
  IdParam,
} from "../../schemas/index.js";
import { ErrorResponseSchema } from "../../schemas/errors.schema.js";

export default async function cartRoutes(app) {
  //todo /carrito es cliente logueado

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
    async () => {
      return {
        id: 1,
      };
    },
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
        },
      },
    },
    async () => {
      return {
        id: 1,
      };
    },
  );

  //modificar cantidad
  app.patch(
    "/carrito/items/:productoId",
    {
      preHandler: [app.authenticate, app.authorize("cliente")],
      schema: {
        security: [{ bearerAuth: [] }],
        params: IdParam,
        body: UpdateCartItemBody,
        response: {
          200: CartItemSchema,
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
        },
      },
    },
    async (request) => {
      const { productoId } = request.params;

      return {
        id: Number(productoId),
      };
    },
  );

  //eliminar producto del carrito
  app.delete(
    "/carrito/items/:productoId",
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
      const { productoId } = request.params;

      console.log(`Eliminando producto ${productoId} del carrito`);

      return reply.code(204).send();
    },
  );
}