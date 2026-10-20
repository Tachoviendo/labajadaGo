import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../environments/environment';
import { Usuario } from '../models/auth.model';
import { CrearUsuarioInternoBody, FiltrosUsuarios, ListaUsuarios } from '../models/usuario.model';

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  readonly #baseUrl = environment.apiUrl + '/usuarios';
  readonly #httpClient = inject(HttpClient);

  //GET /usuarios, solo dueño. devuelve { data, pagination } con el total
  public async listar(filtros: FiltrosUsuarios = {}): Promise<ListaUsuarios> {
    let params = new HttpParams();
    for (const [clave, valor] of Object.entries(filtros)) {
      if (valor !== undefined) {
        params = params.set(clave, String(valor));
      }
    }
    return firstValueFrom(this.#httpClient.get<ListaUsuarios>(this.#baseUrl, { params }));
  }

  //POST /usuarios, solo dueño. crea un cajero o dueño
  public async crear(datos: CrearUsuarioInternoBody): Promise<Usuario> {
    return firstValueFrom(this.#httpClient.post<Usuario>(this.#baseUrl, datos));
  }
}