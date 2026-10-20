import {
  RegisterBody,
  LoginBody,
  RegisterResponse,
  LoginResponse,
  PasswordChangeBody,
} from "../../schemas/index.js";
import { ErrorResponseSchema } from "../../schemas/errors.schema.js";
import { BadRequestError } from "../../errors/response.errors.js";
import * as authService from "../../services/auth.service.js";

export default async function authRoutes(app) {
  //registrar usuario
  app.post(
    "/auth/register",
    {
      schema: {
        body: RegisterBody,
        response: {
          201: RegisterResponse,
          400: ErrorResponseSchema,
          409: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const resultado = await authService.register(app, request.body);
      reply.code(201);
      return resultado;
    },
  );

  //iniciar sesion
  app.post(
    "/auth/login",
    {
      schema: {
        body: LoginBody,
        response: {
          200: LoginResponse,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
        },
      },
    },
    async (request) => {
      const { email, password } = request.body;
      return authService.login(app, email, password);
    },
  );

  //cerrar sesion
  app.post(
    "/auth/logout",
    {
      preHandler: [app.authenticate],
      schema: {
        security: [{ bearerAuth: [] }],
        response: {
          204: { type: "null" },
          401: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      return reply.code(204).send();
    },
  );

  app.patch(
    "/auth/password",
    {
      preHandler: [app.authenticate],
      preValidation: async (request) => {
        const campoNoPermitido = Object.keys(request.body ?? {}).find(
          (campo) => !Object.hasOwn(PasswordChangeBody.properties, campo),
        );
        if (campoNoPermitido) {
          throw new BadRequestError(`el campo '${campoNoPermitido}' no está permitido`);
        }
      },
      schema: {
        security: [{ bearerAuth: [] }],
        body: PasswordChangeBody,
        response: {
          204: { type: "null" },
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      await authService.changePassword(app, request.user.id, request.body);
      return reply.code(204).send();
    },
  );
}
