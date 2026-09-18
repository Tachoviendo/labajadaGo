export default async function userRoutes(app) {
  // Registrar usuario
  app.post("/usuarios", async (request, reply) => {
    return reply.code(201).send({
      message: "Usuario creado",
    });
  });

  // Listar usuarios
  app.get("/usuarios", async (request, reply) => {
    return reply.send([]);
  });

  // Obtener usuario por ID
  app.get("/usuarios/:id", async (request, reply) => {
    const { id } = request.params;

    return reply.send({
      id: Number(id),
    });
  });

  // Modificar usuario
  app.patch("/usuarios/:id", async (request, reply) => {
    const { id } = request.params;

    return reply.send({
      id: Number(id),
      message: "Usuario actualizado",
    });
  });

  // Desactivar usuario
  app.delete("/usuarios/:id", async (request, reply) => {
    const { id } = request.params;

    return reply.code(204).send();
  });
}
