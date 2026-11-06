import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../environments/environment';
import { Carrito, ItemCarrito } from '../models/carrito.model';

@Injectable({ providedIn: 'root' })
export class CarritoService {
  readonly #baseUrl = environment.apiUrl + '/carrito';
  readonly #httpClient = inject(HttpClient);

  //GET /carrito, el del cliente logueado (si no tiene, la api crea uno vacio)
  public async obtener(): Promise<Carrito> {
    return firstValueFrom(this.#httpClient.get<Carrito>(this.#baseUrl));
  }

  //POST /carrito/items. si el producto ya esta, la api suma la cantidad
  public async agregar(productoId: number, cantidad: number): Promise<ItemCarrito> {
    return firstValueFrom(
      this.#httpClient.post<ItemCarrito>(`${this.#baseUrl}/items`, { productoId, cantidad }),
    );
  }

  //PATCH /carrito/items/:productoId, cambia la cantidad (minimo 1)
  public async cambiarCantidad(productoId: number, cantidad: number): Promise<ItemCarrito> {
    return firstValueFrom(
      this.#httpClient.patch<ItemCarrito>(`${this.#baseUrl}/items/${productoId}`, { cantidad }),
    );
  }

  //DELETE /carrito/items/:productoId
  public async quitar(productoId: number): Promise<void> {
    await firstValueFrom(this.#httpClient.delete<void>(`${this.#baseUrl}/items/${productoId}`));
  }
}
