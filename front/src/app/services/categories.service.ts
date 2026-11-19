import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  ActualizarCategoriaBody,
  Categoria,
  CrearCategoriaBody,
} from '../models/product.model';

@Injectable({
  providedIn: 'root',
})
export class CategoriesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/categorias`;

  listar(): Observable<Categoria[]> {
    return this.http.get<Categoria[]>(this.apiUrl);
  }

  //solo dueño. 409 si ya existe una con ese nombre
  crear(datos: CrearCategoriaBody): Observable<Categoria> {
    return this.http.post<Categoria>(this.apiUrl, datos);
  }

  //solo dueño. manda solo los campos que cambian
  actualizar(id: number, datos: ActualizarCategoriaBody): Observable<Categoria> {
    return this.http.patch<Categoria>(`${this.apiUrl}/${id}`, datos);
  }
}
