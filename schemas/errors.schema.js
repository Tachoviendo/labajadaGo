import { Type } from "@fastify/type-provider-typebox";

//forma en la que responde la API cuando se lanza alguno de los errores de
//src/errors/response.errors.js (BadRequestError, NotFoundError, etc.)
//code es el identificador de src/errors/response.errors.js, por ej "NOTFOUND"
export const ErrorResponseSchema = Type.Object({
  statusCode: Type.Integer(),
  code: Type.String(),
  message: Type.String(),
});

//set de responses de error que se repite en la mayoria de los endpoints,
//cada route arma su propio objeto response combinando esto con sus 2xx
//especificos y sacando los codigos que no le correspondan
export const commonErrorResponses = {
  400: ErrorResponseSchema,
  401: ErrorResponseSchema,
  403: ErrorResponseSchema,
  404: ErrorResponseSchema,
  409: ErrorResponseSchema,
};

//codigo 500 aparte: no forma parte del checklist de la entrega pero
//conviene documentarlo ya que InternalError existe en response.errors.js
export const serverErrorResponse = {
  500: ErrorResponseSchema,
};
