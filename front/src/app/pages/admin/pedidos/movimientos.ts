import { RolInterno } from '../../../models/usuario.model';
import { EstadoPedido, Pedido } from '../../../services/orders.service';

//reglas de que puede hacer cada rol con un pedido. las usan el tablero kanban y gestionar
//pedido. son las mismas que valida la api (changeStatus en orders.service.js y recoger en
//repartos.service.js): el front solo las refleja para no ofrecer algo que va a dar 409

export type EstadoTablero = Exclude<EstadoPedido, 'cancelado'>;
export type Movimiento = { destino: EstadoTablero; texto: string };
type MovimientosPorEstado = Partial<Record<EstadoTablero, Movimiento[]>>;

//cajero: preparar y deshacer. salir a reparto y entregar lo hace el repartidor
const CAJERO: MovimientosPorEstado = {
  realizado: [{ destino: 'preparando', texto: 'Empezar a preparar' }],
  preparando: [{ destino: 'realizado', texto: 'Volver a entrantes' }],
  en_reparto: [{ destino: 'preparando', texto: 'Volver a preparando' }],
};

//dueño: lo del cajero y ademas sacar a reparto y marcar entregado a mano
const DUENO: MovimientosPorEstado = {
  realizado: CAJERO.realizado,
  preparando: [...CAJERO.preparando!, { destino: 'en_reparto', texto: 'Sacar a reparto' }],
  en_reparto: [...CAJERO.en_reparto!, { destino: 'entregado', texto: 'Marcar entregado' }],
};

//repartidor: solo recoge (POST /pedidos/:id/recoger). entregar necesita la foto y se hace
//desde su pantalla de reparto
const REPARTIDOR: MovimientosPorEstado = {
  preparando: [{ destino: 'en_reparto', texto: 'Recoger' }],
};

const POR_ROL: Record<RolInterno, MovimientosPorEstado> = {
  cajero: CAJERO,
  dueno: DUENO,
  repartidor: REPARTIDOR,
};

export function movimientosPara(rol: RolInterno, pedido: Pedido): Movimiento[] {
  if (pedido.estado === 'cancelado') return [];
  return POR_ROL[rol][pedido.estado] ?? [];
}

//cancelar: cajero y dueño, solo antes de que salga a reparto (cancelLockedOrder en la api).
//la api ademas lo rechaza si ya esta pago
export function puedeCancelar(rol: RolInterno, pedido: Pedido): boolean {
  return rol !== 'repartidor' && (pedido.estado === 'realizado' || pedido.estado === 'preparando');
}
