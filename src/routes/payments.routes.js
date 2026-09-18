import {
  PaymentSchema,
  RegisterPosPaymentBody,
  MercadoPagoInitResponse,
  IdParam,
} from "../schemas/index.js";

export default async function paymentRoutes(app) {
  // Obtener pago
  app.get(
    "/pagos/:id",
    {
      schema: {
        params: IdParam,
        response: {
          200: PaymentSchema,
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

  // Iniciar pago con MercadoPago
  app.post(
    "/pagos/mercadopago",
    {
      schema: {
        response: {
          201: MercadoPagoInitResponse,
        },
      },
    },
    async () => {
      return {
        message: "Iniciar pago con MercadoPago",
      };
    },
  );

  // Registrar pago POS
  app.patch(
    "/pagos/:id/pos",
    {
      schema: {
        params: IdParam,
        body: RegisterPosPaymentBody,
        response: {
          200: PaymentSchema,
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
}
