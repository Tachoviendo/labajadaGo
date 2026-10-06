import {
  UserSchema,
  UserUpdateBody,
  UserAdminUpdateBody,
  UserFiltersQuery,
  IdParam,
} from "../../schemas/index.js";
import { ErrorResponseSchema } from "../../schemas/errors.schema.js";

export default async function userRoutes(app) {
  //listar usuarios - solo dueño
  app.get(
    "/usuarios",
    {
      preHandler: [app.authenticate, app.authorize("dueno")],
      schema: {
        security: [{ bearerAuth: [] }],
        querystring: UserFiltersQuery,
        response: {
          200: {
            type: "array",
            items: UserSchema,
          },
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
        },
      },
    },
    async () => {
      return [];
    },
  );

  //obtener usuario por id - cualquier rol logueado (ownership: implementar cuando haya service real)
  app.get(
    "/usuarios/:id",
    {
      preHandler: [app.authenticate],
      schema: {
        security: [{ bearerAuth: [] }],
        params: IdParam,
        response: {
          200: UserSchema,
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

  //modificar usuario - cualquier rol logueado, solo su propio perfil (ownership: implementar cuando haya service real)
  app.patch(
    "/usuarios/:id",
    {
      preHandler: [app.authenticate],
      schema: {
        security: [{ bearerAuth: [] }],
        params: IdParam,
        body: UserUpdateBody,
        response: {
          200: UserSchema,
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

  //modificar usuario como administrador - solo dueño
  app.patch(
    "/usuarios/:id/admin",
    {
      preHandler: [app.authenticate, app.authorize("dueno")],
      schema: {
        security: [{ bearerAuth: [] }],
        params: IdParam,
        body: UserAdminUpdateBody,
        response: {
          200: UserSchema,
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

  //desactivar usuario - solo dueño
  app.delete(
    "/usuarios/:id",
    {
      preHandler: [app.authenticate, app.authorize("dueno")],
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

      console.log(`Desactivando usuario ${id}`);

      return reply.code(204).send();
    },
  );
}