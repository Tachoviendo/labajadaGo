import {
  CartSchema,
  CartItemSchema,
  AddCartItemBody,
  UpdateCartItemBody,
  IdParam,
} from "../schemas/index.js";

export default async function cartRoutes(app) {
  // Obtener carrito
  app.get(
    "/carrito",
    {
      schema: {
        response: {
          200: CartSchema,
        },
      },
    },
    async () => {
      return {
        id: 1,
      };
    },
  );

  // Agregar producto al carrito
  app.post(
    "/carrito/items",
    {
      schema: {
        body: AddCartItemBody,
        response: {
          201: CartItemSchema,
        },
      },
    },
    async () => {
      return {
        id: 1,
      };
    },
  );

  // Modificar cantidad
  app.patch(
    "/carrito/items/:productoId",
    {
      schema: {
        params: IdParam,
        body: UpdateCartItemBody,
        response: {
          200: CartItemSchema,
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

  // Eliminar producto del carrito
  app.delete(
    "/carrito/items/:productoId",
    {
      schema: {
        params: IdParam,
      },
    },
    async (request, reply) => {
      const { productoId } = request.params;

      console.log(`Eliminando producto ${productoId} del carrito`);

      return reply.code(204).send();
    },
  );
}
