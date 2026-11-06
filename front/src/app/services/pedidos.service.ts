import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../environments/environment';
import { CrearPedidoBody, FiltrosPedidos, Pedido } from '../models/pedido.model';

@Injectable({ providedIn: 'root' })
export class PedidosService {
  readonly #baseUrl = environment.apiUrl + '/pedidos';
  readonly #httpClient = inject(HttpClient);

  //POST /pedidos, confirma el carrito actual y lo vacia
  public async crear(datos: CrearPedidoBody): Promise<Pedido> {
    return firstValueFrom(this.#httpClient.post<Pedido>(this.#baseUrl, datos));
  }

  //GET /pedidos. para un cliente la api devuelve solo los propios, del mas nuevo al mas viejo
  public async listar(filtros: FiltrosPedidos = {}): Promise<Pedido[]> {
    let params = new HttpParams();
    for (const [clave, valor] of Object.entries(filtros)) {
      if (valor !== undefined) {
        params = params.set(clave, String(valor));
      }
    }
    return firstValueFrom(this.#httpClient.get<Pedido[]>(this.#baseUrl, { params }));
  }

  //GET /pedidos/:id, el propio (o cualquiera si es cajero/dueño)
  public async obtener(id: number): Promise<Pedido> {
    return firstValueFrom(this.#httpClient.get<Pedido>(`${this.#baseUrl}/${id}`));
  }

  //DELETE /pedidos/:id, el cliente cancela su pedido y la base repone el stock
  public async cancelar(id: number): Promise<void> {
    await firstValueFrom(this.#httpClient.delete<void>(`${this.#baseUrl}/${id}`));
  }
}
