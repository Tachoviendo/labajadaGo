export default async function cartRoutes(app) {
  // Obtener el carrito del usuario autenticado
  app.get("/carrito", async () => {
    return {
      message: "Obtener carrito",
    };
  });

  // Agregar un producto al carrito
  app.post("/carrito/items", async () => {
    return {
      message: "Agregar producto al carrito",
    };
  });

  // Modificar la cantidad de un producto del carrito
  app.patch("/carrito/items/:productoId", async (request) => {
    const { productoId } = request.params;

    return {
      message: "Modificar cantidad del producto",
      productoId: Number(productoId),
    };
  });

  // Eliminar un producto del carrito
  app.delete("/carrito/items/:productoId", async (request) => {
    const { productoId } = request.params;

    return {
      message: "Eliminar producto del carrito",
      productoId: Number(productoId),
    };
  });
}
