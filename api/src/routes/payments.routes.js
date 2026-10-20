import {
  PaymentSchema,
  RegisterPosPaymentBody,
  MercadoPagoInitResponse,
  IdParam,
} from "../../schemas/index.js";
import { ErrorResponseSchema } from "../../schemas/errors.schema.js";
import * as paymentsService from "../../services/payments.service.js";

export default async function paymentRoutes(app) {
  //obtener pago - cualquier rol logueado, cliente solo el de su pedido
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
          404: ErrorResponseSchema,
        },
      },
    },
    async (request) => paymentsService.getById(app, request.params.id, request.user),
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
          404: ErrorResponseSchema,
          409: ErrorResponseSchema,
        },
      },
    },
    async (request) =>
      paymentsService.registerPos(
        app,
        request.params.id,
        request.user.id,
        request.body,
      ),
  );
}
