export default async function paymentRoutes(app) {
  // Obtener información de un pago
  app.get("/pagos/:id", async (request) => {
    const { id } = request.params;

    return {
      message: "Obtener pago",
      id: Number(id),
    };
  });

  // Iniciar pago con MercadoPago
  app.post("/pagos/mercadopago", async () => {
    return {
      message: "Iniciar pago con MercadoPago",
    };
  });

  // Registrar pago con POS al momento de la entrega
  app.patch("/pagos/:id/pos", async (request) => {
    const { id } = request.params;

    return {
      message: "Registrar pago POS",
      id: Number(id),
    };
  });
}
