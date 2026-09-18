import { Type } from "@fastify/type-provider-typebox";

//enums compartidos entre distintos schemas de la api.
//mantenerlos aca evita que un mismo concepto (rol, estado, etc.)
//quede definido de formas distintas en dos archivos

//roles de usuario del sistema 
//se usa dueno sin ñ
//valores de enum / query params. ajustable despues por las dudas
export const RolEnum = Type.Union(
  [Type.Literal("cliente"), Type.Literal("cajero"), Type.Literal("dueno")],
  { $id: "RolEnum" },
);

//estados del ciclo de vida / flujo de un pedido
export const EstadoPedidoEnum = Type.Union(
  [
    Type.Literal("realizado"),
    Type.Literal("preparando"),
    Type.Literal("en_reparto"),
    Type.Literal("entregado"),
    Type.Literal("cancelado"),
  ],
  { $id: "EstadoPedidoEnum" },
);

//orden en el que se espera que avance un pedido, para validar transiciones.
//"cancelado" es una excepcion: solo alcanzable desde "realizado" o "preparando"
export const ORDEN_ESTADOS_PEDIDO = [
  "realizado",
  "preparando",
  "en_reparto",
  "entregado",
];

//metodos de pago soportados
export const MetodoPagoEnum = Type.Union(
  [Type.Literal("mercadopago"), Type.Literal("pos")],
  { $id: "MetodoPagoEnum" },
);

//estado de un pago individual
export const EstadoPagoEnum = Type.Union(
  [
    Type.Literal("pendiente"),
    Type.Literal("pagado"),
    Type.Literal("rechazado"),
  ],
  { $id: "EstadoPagoEnum" },
);
