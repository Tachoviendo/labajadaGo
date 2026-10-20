import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { vi } from 'vitest';

import { AuthResponse } from '../models/auth.model';
import { environment } from '../../environments/environment';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpTesting: HttpTestingController;
  let authService: AuthService;
  let router: Router;

  const auth: AuthResponse = {
    token: 'jwt-prueba',
    usuario: {
      id: 4,
      nombre: 'Cliente Prueba',
      email: 'cliente@example.com',
      telefono: null,
      rol: 'cliente',
      activo: true,
      fechaCreacion: '2026-01-01T00:00:00.000Z',
    },
  };

  //arranca la app con (o sin) una sesion guardada
  function configurar(conSesion: boolean) {
    localStorage.clear();
    if (conSesion) {
      localStorage.setItem('labajadaGo.auth', JSON.stringify(auth));
    }
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  }

  afterEach(() => {
    httpTesting.verify();
    localStorage.clear();
  });

  it('agrega el token a las requests a la api', () => {
    configurar(true);
    http.get(`${environment.apiUrl}/pedidos`).subscribe();

    const request = httpTesting.expectOne(`${environment.apiUrl}/pedidos`);
    expect(request.request.headers.get('Authorization')).toBe(`Bearer ${auth.token}`);
    request.flush([]);
  });

  it('no agrega token sin sesión ni a otros dominios', () => {
    configurar(true);
    http.get('https://otro.com/algo').subscribe();
    expect(httpTesting.expectOne('https://otro.com/algo').request.headers.has('Authorization')).toBe(
      false,
    );

    TestBed.resetTestingModule();
    configurar(false);
    http.get(`${environment.apiUrl}/productos`).subscribe();
    expect(
      httpTesting.expectOne(`${environment.apiUrl}/productos`).request.headers.has('Authorization'),
    ).toBe(false);
  });

  it('ante un 401 limpia la sesión, redirige al login y propaga el error', () => {
    configurar(true);
    let status: number | undefined;
    http.get(`${environment.apiUrl}/pedidos`).subscribe({ error: (e) => (status = e.status) });

    httpTesting
      .expectOne(`${environment.apiUrl}/pedidos`)
      .flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(status).toBe(401);
    expect(authService.estaAutenticado).toBe(false);
    expect(localStorage.getItem('labajadaGo.auth')).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/login'], { queryParams: { returnUrl: '/' } });
  });

  it('un 401 del login no redirige (credenciales inválidas)', () => {
    configurar(false);
    authService.login({ email: auth.usuario.email, password: 'mal' }).subscribe({ error: () => {} });

    httpTesting
      .expectOne(`${environment.apiUrl}/auth/login`)
      .flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('no redirige si ya está en el login', () => {
    configurar(true);
    vi.spyOn(router, 'url', 'get').mockReturnValue('/login');
    http.get(`${environment.apiUrl}/pedidos`).subscribe({ error: () => {} });

    httpTesting
      .expectOne(`${environment.apiUrl}/pedidos`)
      .flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(authService.estaAutenticado).toBe(false);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('otros errores no tocan la sesión', () => {
    configurar(true);
    http.get(`${environment.apiUrl}/admin`).subscribe({ error: () => {} });

    httpTesting
      .expectOne(`${environment.apiUrl}/admin`)
      .flush(null, { status: 403, statusText: 'Forbidden' });

    expect(authService.estaAutenticado).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
