import { Type } from "@fastify/type-provider-typebox";
import { EstadoPagoEnum, MetodoPagoEnum } from "./enums.schema.js";


export const PaymentSchema = Type.Object({
  id: Type.Integer(),
  pedidoId: Type.Integer(),
  metodo: MetodoPagoEnum,
  estado: EstadoPagoEnum,
  referenciaExterna: Type.Union([Type.String(), Type.Null()], {
    description: "ID de pago de MercadoPago; null si el método es POS",
  }),
  fechaPago: Type.Union([Type.String({ format: "date-time" }), Type.Null()]),
  registradoPor: Type.Union([Type.Integer(), Type.Null()], {
    description: "Usuario (cajero) que registró el cobro POS; null si fue MercadoPago",
  }),
});

// el cajero marca como cobrado un pedido pagado con POS al recibir.
//no aplica a MercadoPago (ese pago se confirma solo, via webhook/callback)
export const RegisterPosPaymentBody = Type.Object({
  referenciaExterna: Type.Optional(
    Type.String({ maxLength: 150, description: "Número de comprobante del posnet, si aplica" }),
  ),
});

// respuesta al iniciar un pago con MercadoPago (redirect al checkout de MP)
export const MercadoPagoInitResponse = Type.Object({
  pago: PaymentSchema,
  checkoutUrl: Type.String({ format: "uri", description: "URL del checkout de MercadoPago" }),
});
