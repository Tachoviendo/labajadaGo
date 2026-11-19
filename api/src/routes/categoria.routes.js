import {
  CategoryCreateBody,
  CategorySchema,
  CategoryUpdateBody,
  IdParam,
} from "../../schemas/index.js";
import { ErrorResponseSchema } from "../../schemas/errors.schema.js";
import * as categoryService from "../../services/category.service.js";

export default async function categoryRoutes(app) {
  //listar categorias - publica
  app.get(
    "/categorias",
    {
      schema: {
        tags: ["categorias"],
        response: {
          200: {
            type: "array",
            items: CategorySchema,
          },
        },
      },
    },
    async () => categoryService.listar(app),
  );

  //obtener categoria por id - publica
  app.get(
    "/categorias/:id",
    {
      schema: {
        tags: ["categorias"],
        params: IdParam,
        response: {
          200: CategorySchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request) => categoryService.obtener(app, request.params.id),
  );

  //crear categoria - solo dueño. 409 si el nombre ya existe
  app.post(
    "/categorias",
    {
      preHandler: [app.authenticate, app.authorize("dueno")],
      schema: {
        tags: ["categorias"],
        security: [{ bearerAuth: [] }],
        body: CategoryCreateBody,
        response: {
          201: CategorySchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
          409: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const categoria = await categoryService.crear(app, request.body);
      return reply.code(201).send(categoria);
    },
  );

  //modificar categoria - solo dueño. manda solo los campos que cambian
  app.patch(
    "/categorias/:id",
    {
      preHandler: [app.authenticate, app.authorize("dueno")],
      schema: {
        tags: ["categorias"],
        security: [{ bearerAuth: [] }],
        params: IdParam,
        body: CategoryUpdateBody,
        response: {
          200: CategorySchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
          404: ErrorResponseSchema,
          409: ErrorResponseSchema,
        },
      },
    },
    async (request) => categoryService.actualizar(app, request.params.id, request.body),
  );
}
