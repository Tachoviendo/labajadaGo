import {
  RegisterBody,
  LoginBody,
  RegisterResponse,
  LoginResponse,
} from "../../schemas/index.js";
import { ErrorResponseSchema } from "../../schemas/errors.schema.js";
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
}