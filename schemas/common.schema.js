import { Type } from "@fastify/type-provider-typebox";

//partes reutiliazbles en casi todos los endpoints: id de url, headers de auth,
//paginacion. los errores estan en errors.schema.js

//parametro de url generico para recursos con id numerico
export const IdParam = Type.Object({
  id: Type.Integer({ minimum: 1, description: "Identificador numérico del recurso" }),
});

//header obligatorio en endpoints protegidos
//el cliente debe enviar: Authorization: Bearer <token>
export const AuthHeaders = Type.Object(
  {
    authorization: Type.String({
      pattern: "^Bearer .+$",
      description: "Token JWT con el formato 'Bearer <token>'",
    }),
  },
  { additionalProperties: true }, //el objeto headers real trae mas campos (host, etc.)
);

//query params de paginacion, se combinan con filtros propios de cada recurso
export const PaginationQuery = Type.Object({
  page: Type.Optional(
    Type.Integer({ minimum: 1, default: 1, description: "Número de página, arranca en 1" }),
  ),
  limit: Type.Optional(
    Type.Integer({
      minimum: 1,
      maximum: 100,
      default: 20,
      description: "Cantidad de resultados por página (máximo 100)",
    }),
  ),
});

//metadata de paginacion que va dentro de cada response paginado
export const PaginationMeta = Type.Object({
  page: Type.Integer({ minimum: 1 }),
  limit: Type.Integer({ minimum: 1 }),
  total: Type.Integer({ minimum: 0, description: "Cantidad total de resultados" }),
  totalPages: Type.Integer({ minimum: 0 }),
});

//envuelve un schema de item en una respuesta paginada: { data: [...], pagination: {...} }
export const paginated = (itemSchema) =>
  Type.Object({
    data: Type.Array(itemSchema),
    pagination: PaginationMeta,
  });
