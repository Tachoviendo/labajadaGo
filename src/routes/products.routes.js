export default async function productRoutes(app) {
  // Listar productos
  // Más adelante tendrá paginación y filtros.
  app.get("/productos", async (request) => {
    return {
      message: "Listar productos",
      query: request.query,
    };
  });

  // Obtener producto por ID
  app.get("/productos/:id", async (request) => {
    const { id } = request.params;

    return {
      message: "Obtener producto",
      id: Number(id),
    };
  });

  // Crear producto
  app.post("/productos", async () => {
    return {
      message: "Crear producto",
    };
  });

  // Modificar producto
  app.patch("/productos/:id", async (request) => {
    const { id } = request.params;

    return {
      message: "Modificar producto",
      id: Number(id),
    };
  });

  // Desactivar/eliminar producto
  app.delete("/productos/:id", async (request) => {
    const { id } = request.params;

    return {
      message: "Desactivar producto",
      id: Number(id),
    };
  });
}
