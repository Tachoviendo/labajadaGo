import {
  ProductCreateBody,
  ProductUpdateBody,
  ProductFiltersQuery,
  ProductSchema,
  IdParam,
} from "../../schemas/index.js";

export default async function productRoutes(app) {
  // Listar y filtrar productos
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

  // Obtener producto por ID
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

  // Crear producto
  app.post(
    "/productos",
    {
      schema: {
        body: ProductCreateBody,
        response: {
          201: ProductSchema,
        },
      },
    },
    async () => {
      return {
        id: 1,
      };
    },
  );

  // Modificar producto
  app.patch(
    "/productos/:id",
    {
      schema: {
        params: IdParam,
        body: ProductUpdateBody,
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

  // Desactivar producto
  app.delete(
    "/productos/:id",
    {
      schema: {
        params: IdParam,
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      console.log(`Desactivando producto ${id}`);

      return reply.code(204).send();
    },
  );
}
