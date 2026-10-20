import {
  UserSchema,
  UserUpdateBody,
  UserAdminUpdateBody,
  CreateInternalUserBody,
  UserFiltersQuery,
  UserListResponse,
  IdParam,
} from "../../schemas/index.js";
import { ErrorResponseSchema } from "../../schemas/errors.schema.js";
import { ForbiddenError } from "../../errors/response.errors.js";
import * as usersService from "../../services/users.service.js";

//un usuario solo puede operar sobre su propio perfil, salvo el dueño si se permite
function verificarPropio(request, id, permitirDueno) {
  const { id: idLogueado, rol } = request.user;
  if (id === idLogueado) return;
  if (permitirDueno && rol === "dueno") return;
  throw new ForbiddenError("solo podés operar sobre tu propio perfil");
}

export default async function userRoutes(app) {
  //listar usuarios con cantidad total - solo dueño
  app.get(
    "/usuarios",
    {
      preHandler: [app.authenticate, app.authorize("dueno")],
      schema: {
        security: [{ bearerAuth: [] }],
        querystring: UserFiltersQuery,
        response: {
          200: UserListResponse,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
        },
      },
    },
    async (request) => {
      return usersService.listar(app, request.query);
    },
  );

  //crear usuario interno (cajero o dueño) - solo dueño
  app.post(
    "/usuarios",
    {
      preHandler: [app.authenticate, app.authorize("dueno")],
      schema: {
        security: [{ bearerAuth: [] }],
        body: CreateInternalUserBody,
        response: {
          201: UserSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
          409: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const usuario = await usersService.crear(app, request.body);
      reply.code(201);
      return usuario;
    },
  );

  //obtener usuario por id - su propio perfil, o cualquiera si es dueño
  app.get(
    "/usuarios/:id",
    {
      preHandler: [app.authenticate],
      schema: {
        security: [{ bearerAuth: [] }],
        params: IdParam,
        response: {
          200: UserSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request) => {
      const { id } = request.params;
      verificarPropio(request, id, true);
      return usersService.obtener(app, id);
    },
  );

  //modificar usuario - cualquier rol logueado, solo su propio perfil
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
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
          404: ErrorResponseSchema,
          409: ErrorResponseSchema,
        },
      },
    },
    async (request) => {
      const { id } = request.params;
      verificarPropio(request, id, false);
      return usersService.actualizar(app, id, request.body);
    },
  );

  //modificar usuario como administrador (activo, rol) - solo dueño
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
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request) => {
      return usersService.actualizarAdmin(app, request.params.id, request.body);
    },
  );

  //dar de baja usuario (borra sus datos personales) - el propio usuario o el dueño
  app.delete(
    "/usuarios/:id",
    {
      preHandler: [app.authenticate],
      schema: {
        security: [{ bearerAuth: [] }],
        params: IdParam,
        response: {
          204: { type: "null" },
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      verificarPropio(request, id, true);
      await usersService.eliminar(app, id);
      return reply.code(204).send();
    },
  );
}