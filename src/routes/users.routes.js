import {
  UserSchema,
  UserUpdateBody,
  UserAdminUpdateBody,
  UserFiltersQuery,
  IdParam,
} from "../schemas/index.js";

export default async function userRoutes(app) {
  // Listar usuarios
  app.get(
    "/usuarios",
    {
      schema: {
        querystring: UserFiltersQuery,
        response: {
          200: {
            type: "array",
            items: UserSchema,
          },
        },
      },
    },
    async () => {
      return [];
    },
  );

  // Obtener usuario por ID
  app.get(
    "/usuarios/:id",
    {
      schema: {
        params: IdParam,
        response: {
          200: UserSchema,
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

  // Modificar usuario
  app.patch(
    "/usuarios/:id",
    {
      schema: {
        params: IdParam,
        body: UserUpdateBody,
        response: {
          200: UserSchema,
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

  // Modificar usuario como administrador
  app.patch(
    "/usuarios/:id/admin",
    {
      schema: {
        params: IdParam,
        body: UserAdminUpdateBody,
        response: {
          200: UserSchema,
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

  // Desactivar usuario
  app.delete(
    "/usuarios/:id",
    {
      schema: {
        params: IdParam,
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      console.log(`Desactivando usuario ${id}`);

      return reply.code(204).send();
    },
  );
}
