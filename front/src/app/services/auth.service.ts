import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, map, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthResponse, LoginBody, RegisterBody, Rol, Usuario } from '../models/auth.model';

const STORAGE_KEY = 'labajadaGo.auth';
const ROLES: Rol[] = ['cliente', 'cajero', 'dueno'];

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly authSubject = new BehaviorSubject<AuthResponse | null>(
    this.readStoredAuth(),
  );

  readonly auth$ = this.authSubject.asObservable();
  readonly usuario$ = this.auth$.pipe(map((auth) => auth?.usuario ?? null));

  get usuarioActual(): Usuario | null {
    return this.authSubject.value?.usuario ?? null;
  }

  get tokenActual(): string | null {
    return this.authSubject.value?.token ?? null;
  }

  get estaAutenticado(): boolean {
    return this.tokenActual !== null;
  }

  get roles(): Rol[] {
    const rol = this.usuarioActual?.rol;
    return rol ? [rol] : [];
  }

  tieneRol(...roles: Rol[]): boolean {
    return roles.some((rol) => this.usuarioActual?.rol === rol);
  }

  login(body: LoginBody): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/login`, body)
      .pipe(tap((auth) => this.saveAuth(auth)));
  }

  //la api crea un cliente y responde igual que el login, asi queda logueado
  register(body: RegisterBody): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/register`, body)
      .pipe(tap((auth) => this.saveAuth(auth)));
  }

  logout(): Observable<void> {
    const token = this.tokenActual;
    this.saveAuth(null);

    if (!token) {
      return of(void 0);
    }

    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.post<void>(`${environment.apiUrl}/auth/logout`, {}, { headers });
  }

  //borra la sesion local sin llamar a la api (ej: el token ya vencio)
  limpiarSesion(): void {
    this.saveAuth(null);
  }

  private saveAuth(auth: AuthResponse | null): void {
    if (auth) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    this.authSubject.next(auth);
  }

  private readStoredAuth(): AuthResponse | null {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return null;
    }

    try {
      const auth = JSON.parse(stored) as AuthResponse;
      if (
        typeof auth.token === 'string' &&
        typeof auth.usuario?.id === 'number' &&
        ROLES.includes(auth.usuario.rol)
      ) {
        return auth;
      }
    } catch {
      // Una sesión corrupta no debe impedir que arranque la aplicación.
    }

    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}
