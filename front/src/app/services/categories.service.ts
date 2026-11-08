import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Categoria } from '../models/product.model';

@Injectable({
  providedIn: 'root',
})
export class CategoriesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/categorias`;

  listar(): Observable<Categoria[]> {
    return this.http.get<Categoria[]>(this.apiUrl);
  }
}
