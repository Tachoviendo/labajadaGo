import createError from "@fastify/error";

export const BadRequestError = createError(
  "BADREQUEST",
  "Solicitud incorrecta. %s",
  400,
);
export const UnAuthenticatedError = createError(
  "UNAUTHENTICATED",
  "Credenciales inválidas. %s",
  401,
);
export const UnAuthorizedError = createError(
  "UNAUTHORIZED",
  "Credenciales inválidas. %s",
  401,
);
export const NotAuthorizedError = createError(
  "NOTAUTHORIZED",
  "No autorizado. %s",
  403,
);
export const ForbiddenError = createError(
  "FORBIDDEN",
  "Solicitud incorrecta. %s",
  403,
);
export const NotFoundError = createError(
  "NOTFOUND",
  "Elemento no encontrado. %s",
  404,
);
export const ConflictError = createError(
  "CONFLICT",
  "Existe un conflicto en los datos. %s",
  409,
);
export const InternalError = createError("INTERNAL", "Error interno. %s", 500);

//transforma un error crudo de postgres (pg) en uno de los errores de arriba,
//usando el codigo SQLSTATE y el nombre de constraint/tabla para armar un mensaje legible
export function transformarErrorPostgres(error) {
  const { table, constraint } = error;
  const elementoProblematico = constraint
    ?.substring(table?.length || 0)
    .toLowerCase()
    .replace("_fk", "")
    .replace("_key", "")
    .replace("_pk", "");
  console.log({ elementoProblematico });
  switch (error.code) {
    case "23000":
      return new ConflictError(
        `El ${elementoProblematico} no se puede borrar.`,
      );
    case "23001":
      return new ConflictError(
        `El ${elementoProblematico} no se puede borrar.`,
      );
    case "23502":
      return new BadRequestError(
        `El campo '${error.column || "requerido"}' no puede estar vacío.`,
      );
    case "23503":
      return new ConflictError(
        "No se puede completar la acción porque el registro está vinculado a otros datos.",
      );
    case "23505":
      return new ConflictError(
        `Ya existe un ${elementoProblematico} en ${table} .`,
      );
    case "23514":
      return new BadRequestError(
        "Los datos no cumplen con las reglas de validación del sistema.",
      );
    default:
      return new InternalError("No se pudo completar la operación.");
  }
}
