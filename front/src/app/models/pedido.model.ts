//mismo contrato que la api, ver docs/api/pedidos.md
import { Direccion } from './direccion.model';

//api/schemas/enums.schema.js -> EstadoPedidoEnum
export type EstadoPedido = 'realizado' | 'preparando' | 'en_reparto' | 'entregado' | 'cancelado';

//api/schemas/enums.schema.js -> MetodoPagoEnum
export type MetodoPago = 'mercadopago' | 'pos';

//api/schemas/order.schema.js -> OrderItemSchema
export type ItemPedido = {
  id: number;
  productoId: number;
  nombreProducto: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
};

//api/schemas/order.schema.js -> OrderSchema. la direccion es la copia guardada al confirmar
export type Pedido = {
  id: number;
  usuarioId: number;
  direccion: Direccion;
  items: ItemPedido[];
  estado: EstadoPedido;
  metodoPago: MetodoPago;
  total: number;
  fechaCreacion: string;
};

//api/schemas/order.schema.js -> CreateOrderBody. los items salen del carrito
export type CrearPedidoBody = {
  direccionId: number;
  metodoPago: MetodoPago;
};

//api/schemas/order.schema.js -> OrderFiltersQuery
export type FiltrosPedidos = {
  estado?: EstadoPedido;
  page?: number;
  limit?: number;
};

//orden en el que avanza un pedido (api/schemas/enums.schema.js -> ORDEN_ESTADOS_PEDIDO)
export const ORDEN_ESTADOS: EstadoPedido[] = ['realizado', 'preparando', 'en_reparto', 'entregado'];

//como se muestra cada estado: texto para el cliente y color de Ionic
export const ESTADOS_PEDIDO: Record<EstadoPedido, { texto: string; color: string }> = {
  realizado: { texto: 'Pedido realizado', color: 'medium' },
  preparando: { texto: 'Preparando tu pedido', color: 'secondary' },
  en_reparto: { texto: 'En reparto', color: 'primary' },
  entregado: { texto: 'Entregado', color: 'success' },
  cancelado: { texto: 'Cancelado', color: 'danger' },
};

export const METODOS_PAGO: Record<MetodoPago, string> = {
  mercadopago: 'MercadoPago',
  pos: 'POS al recibir',
};

//el cliente solo puede cancelar mientras el pedido no salio a reparto
export const ESTADOS_CANCELABLES: EstadoPedido[] = ['realizado', 'preparando'];
