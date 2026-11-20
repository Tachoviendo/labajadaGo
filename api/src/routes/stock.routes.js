//stock en vivo de los productos.
//  1. el front abre ws://.../api/productos/stock (publico: el stock ya se ve en el catalogo)
//  2. el servidor manda { tipo: "listo" } al conectarse
//  3. cada vez que cambia el stock (pedido confirmado, pedido cancelado, el dueño edita
//     un producto) llega { tipo: "stock", productos: [{ id, stock }] }
//el canal es de un solo sentido: lo que mande el cliente se ignora.
//necesita el plugin plugins/stock.js registrado antes
export default async function stockRoutes(app) {
  app.get(
    "/productos/stock",
    { websocket: true, schema: { hide: true } },
    (socket) => {
      app.stock.unir(socket);
      socket.on("close", () => app.stock.salir(socket));
      socket.send(JSON.stringify({ tipo: "listo" }));
    },
  );
}
