import {
  PaymentSchema,
  RegisterPosPaymentBody,
  MercadoPagoInitResponse,
  IdParam,
} from "../../schemas/index.js";
import { ErrorResponseSchema } from "../../schemas/errors.schema.js";

export default async function paymentRoutes(app) {
  //obtener pago - cualquier rol logueado, cliente solo el de su pedido (ownership: implementar cuando haya service real)
  app.get(
    "/pagos/:id",
    {
      preHandler: [app.authenticate],
      schema: {
        security: [{ bearerAuth: [] }],
        params: IdParam,
        response: {
          200: PaymentSchema,
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
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

  //iniciar pago con mercadopago - cliente logueado, dueño del pedido a pagar
  app.post(
    "/pagos/mercadopago",
    {
      preHandler: [app.authenticate, app.authorize("cliente")],
      schema: {
        security: [{ bearerAuth: [] }],
        response: {
          201: MercadoPagoInitResponse,
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
        },
      },
    },
    async () => {
      return {
        message: "Iniciar pago con MercadoPago",
      };
    },
  );

  //registrar pago pos - cajero o dueño
  app.patch(
    "/pagos/:id/pos",
    {
      preHandler: [app.authenticate, app.authorize("cajero", "dueno")],
      schema: {
        security: [{ bearerAuth: [] }],
        params: IdParam,
        body: RegisterPosPaymentBody,
        response: {
          200: PaymentSchema,
          401: ErrorResponseSchema,
          403: ErrorResponseSchema,
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