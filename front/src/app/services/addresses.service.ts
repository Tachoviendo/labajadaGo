import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type Direccion = {
  id: number;
  usuarioId: number;
  calle: string;
  numero: string | null;
  ciudad: string;
  referencia: string | null;
  //punto marcado en el mapa. null en direcciones viejas que todavia no lo tienen
  lat: number | null;
  lng: number | null;
  esPredeterminada: boolean;
};

export type CrearDireccionBody = {
  calle: string;
  numero?: string;
  ciudad: string;
  referencia?: string;
  lat: number;
  lng: number;
};

export function tieneUbicacion(direccion: Direccion): boolean {
  return direccion.lat !== null && direccion.lng !== null;
}

@Injectable({
  providedIn: 'root',
})
export class AddressesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/direcciones`;

  listar(): Observable<Direccion[]> {
    return this.http.get<Direccion[]>(this.apiUrl);
  }

  obtener(id: number): Observable<Direccion> {
    return this.http.get<Direccion>(`${this.apiUrl}/${id}`);
  }

  crear(datos: CrearDireccionBody): Observable<Direccion> {
    return this.http.post<Direccion>(this.apiUrl, datos);
  }

  actualizar(id: number, datos: Partial<CrearDireccionBody>): Observable<Direccion> {
    return this.http.patch<Direccion>(`${this.apiUrl}/${id}`, datos);
  }
}
