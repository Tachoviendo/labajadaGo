import {
  UserSchema,
  UserUpdateBody,
  UserAdminUpdateBody,
  UserFiltersQuery,
  IdParam,
} from "../../schemas/index.js";
import { ErrorResponseSchema } from "../../schemas/errors.schema.js";
import * as usersService from "../../services/users.service.js";
import { BadRequestError } from "../../errors/response.errors.js";

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

  //obtener usuario por id - propio para cualquier rol; dueno puede consultar cualquiera
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
          404: ErrorResponseSchema,
        },
      },
    },
    async (request) =>
      usersService.getById(app, request.params.id, request.user),
  );

  //modificar usuario - cualquier rol logueado, solo su propio perfil
  app.patch(
    "/usuarios/:id",
    {
      preHandler: [app.authenticate],
      preValidation: async (request) => {
        const campoNoPermitido = Object.keys(request.body ?? {}).find(
          (campo) => !Object.hasOwn(UserUpdateBody.properties, campo),
        );
        if (campoNoPermitido) {
          throw new BadRequestError(`el campo '${campoNoPermitido}' no está permitido`);
        }
      },
      schema: {
        security: [{ bearerAuth: [] }],
        params: IdParam,
        body: UserUpdateBody,
        response: {
          200: UserSchema,
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request) =>
      usersService.updateProfile(
        app,
        request.params.id,
        request.user,
        request.body,
      ),
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
