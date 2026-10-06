import {
  CategoryCreateBody,
  CategorySchema,
  CategoryUpdateBody,
  IdParam,
} from "../../schemas/index.js";
import { ErrorResponseSchema } from "../../schemas/errors.schema.js";

export default async function categoryRoutes(app) {
  //listar categorias - publica
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

  //obtener categoria por id - publica
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

  //crear categoria - solo dueño
  app.post(
    "/categorias",
    {
      preHandler: [app.authenticate, app.authorize("dueno")],
      schema: {
        security: [{ bearerAuth: [] }],
        body: CategoryCreateBody,
        response: {
          201: CategorySchema,
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
        },
      },
    },
    async () => {
      return {
        message: "Crear categoría",
      };
    },
  );

  //modificar categoria - solo dueño
  app.patch(
    "/categorias/:id",
    {
      preHandler: [app.authenticate, app.authorize("dueno")],
      schema: {
        security: [{ bearerAuth: [] }],
        params: IdParam,
        body: CategoryUpdateBody,
        response: {
          200: CategorySchema,
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
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