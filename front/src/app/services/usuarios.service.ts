import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../environments/environment';
import { Usuario } from '../models/auth.model';
import {
  ActualizarAdminBody,
  ActualizarPerfilBody,
  CambiarPasswordBody,
  CrearUsuarioInternoBody,
  FiltrosUsuarios,
  ListaUsuarios,
} from '../models/usuario.model';

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

  //GET /usuarios/:id, el propio perfil o cualquiera si es dueño
  public async obtener(id: number): Promise<Usuario> {
    return firstValueFrom(this.#httpClient.get<Usuario>(`${this.#baseUrl}/${id}`));
  }

  //PATCH /usuarios/:id, solo el propio perfil (nombre, email, telefono)
  public async actualizar(id: number, datos: ActualizarPerfilBody): Promise<Usuario> {
    return firstValueFrom(this.#httpClient.patch<Usuario>(`${this.#baseUrl}/${id}`, datos));
  }

  //PATCH /usuarios/:id/admin, solo dueño (activo, rol)
  public async actualizarAdmin(id: number, datos: ActualizarAdminBody): Promise<Usuario> {
    return firstValueFrom(
      this.#httpClient.patch<Usuario>(`${this.#baseUrl}/${id}/admin`, datos),
    );
  }

  //DELETE /usuarios/:id, baja con borrado de datos personales (propia o del dueño)
  public async eliminar(id: number): Promise<void> {
    await firstValueFrom(this.#httpClient.delete<void>(`${this.#baseUrl}/${id}`));
  }

  //PATCH /auth/password, cambia la contraseña del usuario logueado
  public async cambiarPassword(datos: CambiarPasswordBody): Promise<void> {
    await firstValueFrom(
      this.#httpClient.patch<void>(`${environment.apiUrl}/auth/password`, datos),
    );
  }
}