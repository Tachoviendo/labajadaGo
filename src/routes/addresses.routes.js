import {
  AddressSchema,
  AddressCreateBody,
  AddressUpdateBody,
  IdParam,
} from "../schemas/index.js";

export default async function addressRoutes(app) {
  // Listar direcciones
  app.get(
    "/direcciones",
    {
      schema: {
        response: {
          200: {
            type: "array",
            items: AddressSchema,
          },
        },
      },
    },
    async () => {
      return [];
    },
  );

  // Obtener dirección por ID
  app.get(
    "/direcciones/:id",
    {
      schema: {
        params: IdParam,
        response: {
          200: AddressSchema,
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

  // Crear dirección
  app.post(
    "/direcciones",
    {
      schema: {
        body: AddressCreateBody,
        response: {
          201: AddressSchema,
        },
      },
    },
    async () => {
      return {
        id: 1,
      };
    },
  );

  // Modificar dirección
  app.patch(
    "/direcciones/:id",
    {
      schema: {
        params: IdParam,
        body: AddressUpdateBody,
        response: {
          200: AddressSchema,
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
