export default async function userRoutes(fastify) {
  // Registrar usuario
  fastify.post("/usuarios", async (request, reply) => {
    return reply.code(201).send({
      message: "Usuario creado",
    });
  });

  // Listar usuarios
  fastify.get("/usuarios", async (request, reply) => {
    return reply.send([]);
  });

  // Obtener usuario por ID
  fastify.get("/usuarios/:id", async (request, reply) => {
    const { id } = request.params;

    return reply.send({
      id: Number(id),
    });
  });

  // Modificar usuario
  fastify.patch("/usuarios/:id", async (request, reply) => {
    const { id } = request.params;

    return reply.send({
      id: Number(id),
      message: "Usuario actualizado",
    });
  });

  // Desactivar usuario
  fastify.delete("/usuarios/:id", async (request, reply) => {
    const { id } = request.params;

    return reply.code(204).send();
  });
}
