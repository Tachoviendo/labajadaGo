export default async function categoryRoutes(app) {
  // Listar categorías
  app.get("/categorias", async () => {
    return [];
  });

  // Obtener categoría por ID
  app.get("/categorias/:id", async (request) => {
    const { id } = request.params;

    return {
      message: "Obtener categoría",
      id: Number(id),
    };
  });

  // Crear categoría
  app.post("/categorias", async () => {
    return {
      message: "Crear categoría",
    };
  });

  // Modificar categoría
  app.patch("/categorias/:id", async (request) => {
    const { id } = request.params;

    return {
      message: "Modificar categoría",
      id: Number(id),
    };
  });
}
