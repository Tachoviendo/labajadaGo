import {
  CategoryCreateBody,
  CategorySchema,
  CategoryUpdateBody,
  IdParam,
} from "../../schemas/index.js";

export default async function categoryRoutes(app) {
  // Listar categorías
  app.get(
    "/categorias",
    {
      schema: {
        response: {
          200: {
            type: "array",
            items: CategorySchema,
          },
        },
      },
    },
    async () => {
      return [];
    },
  );

  // Obtener categoría por ID
  app.get(
    "/categorias/:id",
    {
      schema: {
        params: IdParam,
        response: {
          200: CategorySchema,
        },
      },
    },
    async (request) => {
      const { id } = request.params;

      return {
        message: "Obtener categoría",
        id: Number(id),
      };
    },
  );

  // Crear categoría
  app.post(
    "/categorias",
    {
      schema: {
        body: CategoryCreateBody,
        response: {
          201: CategorySchema,
        },
      },
    },
    async () => {
      return {
        message: "Crear categoría",
      };
    },
  );

  // Modificar categoría
  app.patch(
    "/categorias/:id",
    {
      schema: {
        params: IdParam,
        body: CategoryUpdateBody,
        response: {
          200: CategorySchema,
        },
      },
    },
    async (request) => {
      const { id } = request.params;

      return {
        message: "Modificar categoría",
        id: Number(id),
      };
    },
  );
}
