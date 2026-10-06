import {
  AddressSchema,
  AddressCreateBody,
  AddressUpdateBody,
  IdParam,
} from "../../schemas/index.js";
import { ErrorResponseSchema } from "../../schemas/errors.schema.js";

export default async function addressRoutes(app) {
  //todo /direcciones es cliente logueado

  //listar direcciones
  app.get(
    "/direcciones",
    {
      preHandler: [app.authenticate, app.authorize("cliente")],
      schema: {
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: "array",
            items: AddressSchema,
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

  //obtener direccion por id
  app.get(
    "/direcciones/:id",
    {
      preHandler: [app.authenticate, app.authorize("cliente")],
      schema: {
        security: [{ bearerAuth: [] }],
        params: IdParam,
        response: {
          200: AddressSchema,
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

  //crear direccion
  app.post(
    "/direcciones",
    {
      preHandler: [app.authenticate, app.authorize("cliente")],
      schema: {
        security: [{ bearerAuth: [] }],
        body: AddressCreateBody,
        response: {
          201: AddressSchema,
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
        },
      },
    },
    async () => {
      return {
        id: 1,
      };
    },
  );

  //modificar direccion
  app.patch(
    "/direcciones/:id",
    {
      preHandler: [app.authenticate, app.authorize("cliente")],
      schema: {
        security: [{ bearerAuth: [] }],
        params: IdParam,
        body: AddressUpdateBody,
        response: {
          200: AddressSchema,
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
}