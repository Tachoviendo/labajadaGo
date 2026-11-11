import { HttpClient } from '@angular/common/http';
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
    esPredeterminada: boolean;
  };
  items: PedidoItem[];
  estado: EstadoPedido;
  metodoPago: MetodoPago;
  total: number;
  fechaCreacion: string;
};

@Injectable({
  providedIn: 'root',
})
export class OrdersService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/pedidos`;

  crear(datos: CrearPedidoBody): Observable<Pedido> {
    return this.http.post<Pedido>(this.apiUrl, datos);
  }

  listar(): Observable<Pedido[]> {
    return this.http.get<Pedido[]>(this.apiUrl);
  }

  obtener(id: number): Observable<Pedido> {
    return this.http.get<Pedido>(`${this.apiUrl}/${id}`);
  }

  cancelar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
