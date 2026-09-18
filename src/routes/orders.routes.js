export default async function orderRoutes(app) {
  // Listar pedidos
  // Cliente: sus propios pedidos.
  // Cajero/Dueño: pedidos activos y filtros.
  app.get("/pedidos", async (request) => {
    return {
      message: "Listar pedidos",
      query: request.query,
    };
  });

  // Crear pedido / checkout
  // Los productos se toman del carrito del usuario.
  app.post("/pedidos", async () => {
    return {
      message: "Crear pedido",
    };
  });

  // Obtener detalle de un pedido
  app.get("/pedidos/:id", async (request) => {
    const { id } = request.params;

    return {
      message: "Obtener pedido",
      id: Number(id),
    };
  });

  // Cambiar estado de un pedido
  // Cajero/Dueño
  app.patch("/pedidos/:id/estado", async (request) => {
    const { id } = request.params;

    return {
      message: "Cambiar estado del pedido",
      id: Number(id),
    };
  });

  // Cancelar pedido
  // Cliente, mientras corresponda según el estado.
  app.delete("/pedidos/:id", async (request) => {
    const { id } = request.params;

    return {
      message: "Cancelar pedido",
      id: Number(id),
    };
  });
}
