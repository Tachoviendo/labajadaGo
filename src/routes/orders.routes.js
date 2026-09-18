import {
  CreateOrderBody,
  OrderSchema,
  OrderFiltersQuery,
  OrderStatusChangeBody,
  IdParam,
} from "../../schemas/index.js";

export default async function orderRoutes(app) {
  // Listar pedidos
  app.get(
    "/pedidos",
    {
      schema: {
        querystring: OrderFiltersQuery,
        response: {
          200: {
            type: "array",
            items: OrderSchema,
          },
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

  // Crear pedido
  app.post(
    "/pedidos",
    {
      schema: {
        body: CreateOrderBody,
        response: {
          201: OrderSchema,
        },
      },
    },
    async () => {
      return {
        id: 1,
      };
    },
  );

  // Obtener pedido
  app.get(
    "/pedidos/:id",
    {
      schema: {
        params: IdParam,
        response: {
          200: OrderSchema,
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

  // Cambiar estado del pedido
  app.patch(
    "/pedidos/:id/estado",
    {
      schema: {
        params: IdParam,
        body: OrderStatusChangeBody,
        response: {
          200: OrderSchema,
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

  // Cancelar pedido
  app.delete(
    "/pedidos/:id",
    {
      schema: {
        params: IdParam,
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      console.log(`Cancelando pedido ${id}`);

      return reply.code(204).send();
    },
  );
}
