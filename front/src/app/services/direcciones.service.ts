import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../environments/environment';
import {
  ActualizarDireccionBody,
  CrearDireccionBody,
  Direccion,
} from '../models/direccion.model';

@Injectable({ providedIn: 'root' })
export class DireccionesService {
  readonly #baseUrl = environment.apiUrl + '/direcciones';
  readonly #httpClient = inject(HttpClient);

  //GET /direcciones, solo las del cliente logueado
  public async listar(): Promise<Direccion[]> {
    return firstValueFrom(this.#httpClient.get<Direccion[]>(this.#baseUrl));
  }

  //POST /direcciones
  public async crear(datos: CrearDireccionBody): Promise<Direccion> {
    return firstValueFrom(this.#httpClient.post<Direccion>(this.#baseUrl, datos));
  }

  //PATCH /direcciones/:id, solo una direccion propia
  public async actualizar(id: number, datos: ActualizarDireccionBody): Promise<Direccion> {
    return firstValueFrom(this.#httpClient.patch<Direccion>(`${this.#baseUrl}/${id}`, datos));
  }
}
