import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type ProductoCarrito = {
  id: number;
  nombre: string;
  descripcion: string | null;
  precio: number;
  categoria: string | null;
  imagenUrl: string | null;
  stock: number;
  activo: boolean;
};

export type ItemCarrito = {
  id: number;
  producto: ProductoCarrito;
  cantidad: number;
  subtotal: number;
};

export type Carrito = {
  id: number;
  usuarioId: number;
  items: ItemCarrito[];
  total: number;
  fechaActualizacion: string;
};

export type AgregarCarritoBody = {
  productoId: number;
  cantidad: number;
};

@Injectable({
  providedIn: 'root',
})
export class CartService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/carrito`;

  obtener(): Observable<Carrito> {
    return this.http.get<Carrito>(this.apiUrl);
  }

  agregar(productoId: number, cantidad = 1): Observable<ItemCarrito> {
    const body: AgregarCarritoBody = { productoId, cantidad };

    return this.http.post<ItemCarrito>(`${this.apiUrl}/items`, body);
  }

  actualizar(productoId: number, cantidad: number): Observable<ItemCarrito> {
    return this.http.patch<ItemCarrito>(`${this.apiUrl}/items/${productoId}`, { cantidad });
  }

  eliminar(productoId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/items/${productoId}`);
  }
}
