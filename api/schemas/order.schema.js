import { Type } from "@fastify/type-provider-typebox";
import { AddressSchema } from "./address.schema.js";
import { PaginationQuery } from "./common.schema.js";
import { EstadoPedidoEnum, MetodoPagoEnum } from "./enums.schema.js";

//pedido item, snapshot del producto al momento de la compra
export const OrderItemSchema = Type.Object({
  id: Type.Integer(),
  productoId: Type.Integer(),
  nombreProducto: Type.String({
    description: "Nombre del producto al momento de la compra (no cambia si el producto se edita después)",
  }),
  cantidad: Type.Integer({ minimum: 1 }),
  precioUnitario: Type.Integer({
    minimum: 0,
    description: "Snapshot del precio al momento del pedido (pedido_item.precio_unitario)",
  }),
  subtotal: Type.Integer({ minimum: 0 }),
});

//pedido
export const OrderSchema = Type.Object({
  id: Type.Integer(),
  usuarioId: Type.Integer(),
  direccion: AddressSchema,
  items: Type.Array(OrderItemSchema),
  estado: EstadoPedidoEnum,
  metodoPago: MetodoPagoEnum,
  total: Type.Integer({ minimum: 0 }),
  fechaCreacion: Type.String({ format: "date-time" }),
  repartidorId: Type.Union([Type.Integer(), Type.Null()], {
    description: "Repartidor que recogió el pedido; null hasta que alguien lo recoge",
  }),
  fotoEntregaUrl: Type.Union([Type.String(), Type.Null()], {
    description: "Foto que saca el repartidor al entregar (url del bucket)",
  }),
});

//checkout. el body no recibe los items, se toman del carrito
//actual del usuario autenticado (el carrito se vacia al confirmar).
//un carrito vacio al momento del checkout -> 409 (estado de conflicto,
//no de validacion del body en si)
export const CreateOrderBody = Type.Object({
  direccionId: Type.Integer({ minimum: 1 }),
  metodoPago: MetodoPagoEnum,
});

// avanzar o retoceder el estado de un pedido.
//la transicion valida que de "realizado" a "en_reparto" no se pueda saltear
//"preparando", por ejemplo la valida el service, no el schema, aca solo
//se valida que el valor pertenezca al enum
export const OrderStatusChangeBody = Type.Object({
  estado: EstadoPedidoEnum,
});

//historial de estado. auditoria
export const OrderStatusHistorySchema = Type.Object({
  id: Type.Integer(),
  pedidoId: Type.Integer(),
  estado: EstadoPedidoEnum,
  fecha: Type.String({ format: "date-time" }),
  usuarioId: Type.Union([Type.Integer(), Type.Null()], {
    description: "Quién hizo el cambio; puede ser null si fue automático",
  }),
});

//historial del cliente y listado para cajero/dueño.
//el mismo endpoint /orders se reusa para ambos casos: si quien pregunta es
//"clietne", el service ignora cualquier filtro de usuario y solo devuelve
//los propios, si es cajero/dueño, puede ver todos y filtrar
export const OrderFiltersQuery = Type.Object({
  ...PaginationQuery.properties,
  estado: Type.Optional(EstadoPedidoEnum),
  //pantalla de pedidos entrantes: solo los que todavia hay que atender
  activos: Type.Optional(
    Type.Boolean({
      description:
        "true: solo pedidos en curso (realizado, preparando, en_reparto). Se combina con estado",
    }),
  ),
  fechaDesde: Type.Optional(Type.String({ format: "date" })),
  fechaHasta: Type.Optional(Type.String({ format: "date" })),
  sort: Type.Optional(
    Type.Union([Type.Literal("fecha_asc"), Type.Literal("fecha_desc")], {
      default: "fecha_desc",
    }),
  ),
});

//panel de ventas del dueño. sin fechas toma todo el historial
export const SalesSummaryQuery = Type.Object({
  fechaDesde: Type.Optional(
    Type.String({ format: "date", examples: ["2026-11-01"] }),
  ),
  fechaHasta: Type.Optional(
    Type.String({ format: "date", examples: ["2026-11-30"] }),
  ),
  top: Type.Optional(
    Type.Integer({
      minimum: 1,
      maximum: 20,
      default: 5,
      description: "Cantidad de productos más vendidos a devolver",
    }),
  ),
});

export const SalesSummarySchema = Type.Object(
  {
    fechaDesde: Type.Union([Type.String({ format: "date" }), Type.Null()]),
    fechaHasta: Type.Union([Type.String({ format: "date" }), Type.Null()]),
    totalVendido: Type.Integer({
      minimum: 0,
      description: "Suma de los totales de pedidos no cancelados",
    }),
    cantidadPedidos: Type.Integer({
      minimum: 0,
      description: "Pedidos no cancelados en el rango",
    }),
    ticketPromedio: Type.Integer({
      minimum: 0,
      description: "totalVendido / cantidadPedidos, redondeado",
    }),
    porEstado: Type.Array(
      Type.Object({
        estado: EstadoPedidoEnum,
        cantidad: Type.Integer({ minimum: 0 }),
      }),
      { description: "Un elemento por cada estado, incluidos cancelados y los que tienen 0" },
    ),
    masVendidos: Type.Array(
      Type.Object({
        productoId: Type.Integer(),
        nombre: Type.String(),
        cantidad: Type.Integer({ minimum: 1 }),
        total: Type.Integer({ minimum: 0 }),
      }),
    ),
  },
  {
    examples: [
      {
        fechaDesde: "2026-11-01",
        fechaHasta: "2026-11-30",
        totalVendido: 48500,
        cantidadPedidos: 12,
        ticketPromedio: 4042,
        porEstado: [
          { estado: "realizado", cantidad: 2 },
          { estado: "preparando", cantidad: 1 },
          { estado: "en_reparto", cantidad: 1 },
          { estado: "entregado", cantidad: 8 },
          { estado: "cancelado", cantidad: 1 },
        ],
        masVendidos: [
          { productoId: 4, nombre: "Coca-Cola 1.5L", cantidad: 9, total: 13500 },
          { productoId: 1, nombre: "Alfajor Guaymallén", cantidad: 15, total: 4500 },
        ],
      },
    ],
  },
);
