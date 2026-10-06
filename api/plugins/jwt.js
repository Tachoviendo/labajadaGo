import fp from "fastify-plugin";
import jwt from "@fastify/jwt";
import { UnAuthenticatedError, ForbiddenError } from "../errors/response.errors.js";

export default fp(async (fastify) => {
  const secreto = process.env.FASTIFY_SECRET;
  if (!secreto) throw new Error("No especificaste FASTIFY_SECRET");

  fastify.register(jwt, {
    secret: secreto,
  });

  //verifica el token, deja el payload en request.user
  fastify.decorate("authenticate", async function (request, reply) {
    try {
      await request.jwtVerify();
    } catch {
      throw new UnAuthenticatedError("token ausente o inválido");
    }
  });

  //exige que request.user.rol este entre los permitidos, usar despues de authenticate
  fastify.decorate("authorize", (...rolesPermitidos) => {
    return async function (request, reply) {
      if (!request.user) {
        throw new UnAuthenticatedError("token ausente o inválido");
      }
      if (!rolesPermitidos.includes(request.user.rol)) {
        throw new ForbiddenError("tu rol no tiene acceso a esta operación");
      }
    };
  });
});