import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthResponse, LoginBody, RegisterBody } from '../models/auth.model';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

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

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('envía el login a la API y conserva usuario y token', () => {
    const body: LoginBody = { email: auth.usuario.email, password: 'secreto' };
    let respuesta: AuthResponse | undefined;

    service.login(body).subscribe((result) => (respuesta = result));

    const request = http.expectOne(`${environment.apiUrl}/auth/login`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(body);
    request.flush(auth);

    expect(respuesta).toEqual(auth);
    expect(service.usuarioActual).toEqual(auth.usuario);
    expect(service.tokenActual).toBe(auth.token);
    expect(service.estaAutenticado).toBe(true);
    expect(service.roles).toEqual(['cliente']);
    expect(service.tieneRol('cliente')).toBe(true);
    expect(service.tieneRol('dueno')).toBe(false);
    expect(JSON.parse(localStorage.getItem('labajadaGo.auth')!)).toEqual(auth);
  });

  it('propaga el error HTTP devuelto por la API', () => {
    const body: LoginBody = { email: auth.usuario.email, password: 'incorrecta' };
    let error: HttpErrorResponse | undefined;

    service.login(body).subscribe({ error: (result) => (error = result) });
    http.expectOne(`${environment.apiUrl}/auth/login`).flush(
      { statusCode: 401, code: 'UNAUTHENTICATED', message: 'Credenciales inválidas' },
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(error?.status).toBe(401);
    expect(error?.error.message).toBe('Credenciales inválidas');
    expect(service.estaAutenticado).toBe(false);
  });

  it('envía el registro a la API y deja la sesión iniciada', () => {
    const body: RegisterBody = {
      nombre: auth.usuario.nombre,
      email: auth.usuario.email,
      password: 'secreto123',
    };
    let respuesta: AuthResponse | undefined;

    service.register(body).subscribe((result) => (respuesta = result));

    const request = http.expectOne(`${environment.apiUrl}/auth/register`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(body);
    request.flush(auth, { status: 201, statusText: 'Created' });

    expect(respuesta).toEqual(auth);
    expect(service.usuarioActual).toEqual(auth.usuario);
    expect(service.tokenActual).toBe(auth.token);
    expect(JSON.parse(localStorage.getItem('labajadaGo.auth')!)).toEqual(auth);
  });

  it('recupera la sesión persistida y permite cerrar sesión en la API', () => {
    localStorage.setItem('labajadaGo.auth', JSON.stringify(auth));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);

    expect(service.usuarioActual).toEqual(auth.usuario);
    expect(service.estaAutenticado).toBe(true);

    service.logout().subscribe();
    const request = http.expectOne(`${environment.apiUrl}/auth/logout`);
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('Authorization')).toBe(`Bearer ${auth.token}`);
    expect(service.usuarioActual).toBeNull();
    expect(service.estaAutenticado).toBe(false);
    expect(localStorage.getItem('labajadaGo.auth')).toBeNull();
    request.flush(null);
  });

  it('descarta una sesión persistida inválida', () => {
    localStorage.setItem('labajadaGo.auth', '{invalido');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);

    expect(service.usuarioActual).toBeNull();
    expect(service.estaAutenticado).toBe(false);
    expect(localStorage.getItem('labajadaGo.auth')).toBeNull();
  });
});
