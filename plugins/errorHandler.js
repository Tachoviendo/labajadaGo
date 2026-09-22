import fp from "fastify-plugin";
import {
  BadRequestError,
  InternalError,
  transformarErrorPostgres,
} from "../errors/response.errors.js";

function formatear(reply, err) {
  return reply.code(err.statusCode).send({
    statusCode: err.statusCode,
    code: err.code,
    message: err.message,
  });
}

//distingue un error crudo de postgres (sqlstate de 5 caracteres + severity)
function esErrorDePostgres(error) {
  return typeof error.code === "string" && /^[0-9A-Z]{5}$/.test(error.code) && !!error.severity;
}

export default fp(async (fastify) => {
  fastify.setErrorHandler((error, request, reply) => {
    //body/params/querystring que no pasan el schema
    if (error.code === "FST_ERR_VALIDATION") {
      return formatear(reply, new BadRequestError(error.message));
    }

    //error de postgres que se escapo sin pasar por transformarErrorPostgres
    if (esErrorDePostgres(error)) {
      request.log.error(error);
      return formatear(reply, transformarErrorPostgres(error));
    }

    //errores propios (@fastify/error): ya traen statusCode + code
    if (typeof error.statusCode === "number" && typeof error.code === "string") {
      return formatear(reply, error);
    }

    //cualquier otra cosa no prevista
    request.log.error(error);
    return formatear(reply, new InternalError("ocurrió un error inesperado"));
  });
});