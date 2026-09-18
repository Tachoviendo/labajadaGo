export default async function addressRoutes(app) {
  // Listar direcciones del usuario autenticado
  app.get("/direcciones", async () => {
    return {
      message: "Listar direcciones",
    };
  });

  // Obtener una dirección
  app.get("/direcciones/:id", async (request) => {
    const { id } = request.params;

    return {
      message: "Obtener dirección",
      id: Number(id),
    };
  });

  // Crear una dirección
  app.post("/direcciones", async () => {
    return {
      message: "Crear dirección",
    };
  });

  // Modificar una dirección
  app.patch("/direcciones/:id", async (request) => {
    const { id } = request.params;

    return {
      message: "Modificar dirección",
      id: Number(id),
    };
  });
}
