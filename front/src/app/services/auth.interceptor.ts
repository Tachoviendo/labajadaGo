import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

//en estas un 401 no significa sesion vencida (login: credenciales malas, logout: ya no hay sesion)
const SIN_MANEJO_401 = [`${environment.apiUrl}/auth/login`, `${environment.apiUrl}/auth/logout`];

//agrega el token a las requests a nuestra api.
//si la request ya trae Authorization (ej: logout) no la pisa
//si la api responde 401 la sesion no sirve mas: se limpia y se manda al login
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }

  const token = authService.tokenActual;
  const request =
    token && !req.headers.has('Authorization')
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  return next(request).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !SIN_MANEJO_401.includes(req.url)
      ) {
        authService.limpiarSesion();
        //si ya estamos en el login no redirigimos de nuevo (evita ciclos)
        if (!router.url.startsWith('/login')) {
          router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
        }
      }
      //el error sigue para que la pagina pueda mostrar su mensaje
      return throwError(() => error);
    }),
  );
};
