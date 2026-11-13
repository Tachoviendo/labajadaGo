import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { FiltrosProductos, Producto, ProductosPaginados } from '../models/product.model';

@Injectable({
  providedIn: 'root',
})
export class ProductsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/productos`;

  listar(filtros: FiltrosProductos = {}): Observable<ProductosPaginados> {
    let params = new HttpParams();

    Object.entries(filtros).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });

    return this.http.get<ProductosPaginados>(this.apiUrl, { params });
  }

  obtener(id: number): Observable<Producto> {
    return this.http.get<Producto>(`${this.apiUrl}/${id}`);
  }

  //solo dueño. la api la guarda en el bucket y devuelve el producto con la nueva imagenUrl
  subirImagen(id: number, archivo: File): Observable<Producto> {
    const formData = new FormData();
    formData.append('file', archivo, archivo.name);
    return this.http.post<Producto>(`${this.apiUrl}/${id}/imagen`, formData);
  }
}
