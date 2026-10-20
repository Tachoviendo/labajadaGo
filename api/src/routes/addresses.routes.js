import {
  AddressSchema,
  AddressCreateBody,
  AddressUpdateBody,
  IdParam,
} from "../../schemas/index.js";
import { ErrorResponseSchema } from "../../schemas/errors.schema.js";
import * as addressesService from "../../services/addresses.service.js";

export default async function addressRoutes(app) {
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
    async (request) => addressesService.listForUser(app, request.user.id),
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
          404: ErrorResponseSchema,
        },
      },
    },
    async (request) =>
      addressesService.getById(app, request.params.id, request.user.id),
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
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const direccion = await addressesService.create(
        app,
        request.user.id,
        request.body,
      );
      reply.code(201);
      return direccion;
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
          400: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request) =>
      addressesService.update(
        app,
        request.params.id,
        request.user.id,
        request.body,
      ),
  );
}
