import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type MetodoPago = 'mercadopago' | 'pos';

export type EstadoPedido = 'realizado' | 'preparando' | 'en_reparto' | 'entregado' | 'cancelado';

export type CrearPedidoBody = {
  direccionId: number;
  metodoPago: MetodoPago;
};

export type PedidoItem = {
  id: number;
  productoId: number;
  nombreProducto: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
};

export type Pedido = {
  id: number;
  usuarioId: number;
  direccion: {
    id: number;
    usuarioId: number;
    calle: string;
    numero: string | null;
    ciudad: string;
    referencia: string | null;
    //destino del reparto en el mapa (copia del punto de la direccion al hacer el pedido)
    lat: number | null;
    lng: number | null;
    esPredeterminada: boolean;
  };
  items: PedidoItem[];
  estado: EstadoPedido;
  metodoPago: MetodoPago;
  total: number;
  fechaCreacion: string;
  //repartidor que lo recogio (null hasta que sale a reparto)
  repartidorId: number | null;
  //foto que saca el repartidor al entregar (ruta relativa del bucket, ej: /bucket/x.jpg)
  fotoEntregaUrl: string | null;
};

//api/schemas/order.schema.js -> OrderFiltersQuery.
//el cliente solo ve los suyos y el repartidor los que tiene asignados (lo resuelve la api)
export type FiltrosPedidos = {
  estado?: EstadoPedido;
  //true: solo realizado, preparando y en_reparto (pantalla de pedidos entrantes)
  activos?: boolean;
  fechaDesde?: string; //YYYY-MM-DD
  fechaHasta?: string;
  sort?: 'fecha_asc' | 'fecha_desc';
  page?: number;
  limit?: number;
};

//api/schemas/order.schema.js -> SalesSummaryQuery
export type FiltrosResumen = {
  fechaDesde?: string; //YYYY-MM-DD
  fechaHasta?: string;
  top?: number;
};

//api/schemas/order.schema.js -> SalesSummarySchema (GET /pedidos/resumen, solo dueño)
export type ResumenVentas = {
  fechaDesde: string | null;
  fechaHasta: string | null;
  totalVendido: number;
  cantidadPedidos: number;
  ticketPromedio: number;
  porEstado: { estado: EstadoPedido; cantidad: number }[];
  masVendidos: { productoId: number; nombre: string; cantidad: number; total: number }[];
};

//api/schemas/order.schema.js -> OrderStatusHistorySchema (GET /pedidos/:id/historial)
export type CambioDeEstado = {
  id: number;
  pedidoId: number;
  estado: EstadoPedido;
  fecha: string;
  usuarioId: number | null;
  //quien hizo el cambio. el primero ('realizado') es el cliente
  usuario: { nombre: string; rol: string; telefono: string | null } | null;
};

//arma los query params salteando los vacios (undefined, null, '')
function aParams(filtros: object): HttpParams {
  let params = new HttpParams();
  for (const [clave, valor] of Object.entries(filtros)) {
    if (valor !== undefined && valor !== null && valor !== '') {
      params = params.set(clave, String(valor));
    }
  }
  return params;
}

@Injectable({
  providedIn: 'root',
})
export class OrdersService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/pedidos`;

  crear(datos: CrearPedidoBody): Observable<Pedido> {
    return this.http.post<Pedido>(this.apiUrl, datos);
  }

  listar(filtros: FiltrosPedidos = {}): Observable<Pedido[]> {
    return this.http.get<Pedido[]>(this.apiUrl, { params: aParams(filtros) });
  }

  //cajero o dueño: quien cambio el estado y cuando
  historial(id: number): Observable<CambioDeEstado[]> {
    return this.http.get<CambioDeEstado[]>(`${this.apiUrl}/${id}/historial`);
  }

  //cajero o dueño. la api solo deja moverlo de a un paso (409 si no se puede).
  //'cancelado' solo desde realizado o preparando y si no esta pago.
  //sacar a reparto y entregar: el dueño o el repartidor (con recoger/entregar)
  cambiarEstado(id: number, estado: EstadoPedido): Observable<Pedido> {
    return this.http.patch<Pedido>(`${this.apiUrl}/${id}/estado`, { estado });
  }

  //solo dueño, para estadisticas
  resumen(filtros: FiltrosResumen = {}): Observable<ResumenVentas> {
    return this.http.get<ResumenVentas>(`${this.apiUrl}/resumen`, { params: aParams(filtros) });
  }

  obtener(id: number): Observable<Pedido> {
    return this.http.get<Pedido>(`${this.apiUrl}/${id}`);
  }

  cancelar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
