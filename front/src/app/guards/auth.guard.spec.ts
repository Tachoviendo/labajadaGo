import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';

import { AuthResponse, Rol } from '../models/auth.model';
import { authGuard, rolGuard } from './auth.guard';

describe('guards de autenticación', () => {
  //arranca la app con la sesion de un usuario de ese rol (o sin sesion)
  function configurar(rol: Rol | null) {
    localStorage.clear();
    if (rol) {
      const auth: AuthResponse = {
        token: 'jwt-prueba',
        usuario: {
          id: 1,
          nombre: 'Prueba',
          email: 'prueba@example.com',
          telefono: null,
          rol,
          activo: true,
          fechaCreacion: '2026-01-01T00:00:00.000Z',
        },
      };
      localStorage.setItem('labajadaGo.auth', JSON.stringify(auth));
    }
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideRouter([])],
    });
  }

  //corre el guard como si se navegara a url y devuelve true o la url a la que redirige
  function correr(guard: CanActivateFn, url: string) {
    const result = TestBed.runInInjectionContext(() =>
      guard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
    );
    return result instanceof UrlTree ? TestBed.inject(Router).serializeUrl(result) : result;
  }

  afterEach(() => localStorage.clear());

  it('authGuard manda al login sin sesión y recuerda la url', () => {
    configurar(null);
    expect(correr(authGuard, '/perfil')).toBe('/login?returnUrl=%2Fperfil');
  });

  it('authGuard deja pasar a cualquier usuario logueado', () => {
    configurar('cajero');
    expect(correr(authGuard, '/perfil')).toBe(true);
  });

  it('rolGuard manda al login sin sesión', () => {
    configurar(null);
    expect(correr(rolGuard('dueno'), '/admin/productos')).toBe(
      '/login?returnUrl=%2Fadmin%2Fproductos',
    );
  });

  it('rolGuard deja pasar a los roles permitidos', () => {
    configurar('cajero');
    expect(correr(rolGuard('cajero', 'dueno'), '/admin/pedidos')).toBe(true);
  });

  it('rolGuard manda a sin-permisos si el rol no corresponde', () => {
    configurar('cliente');
    expect(correr(rolGuard('dueno'), '/admin/usuarios')).toBe('/sin-permisos');

    TestBed.resetTestingModule();
    configurar('cajero');
    expect(correr(rolGuard('dueno'), '/admin/usuarios')).toBe('/sin-permisos');
  });
});
