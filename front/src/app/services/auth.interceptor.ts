import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

//agrega el token a las requests a nuestra api.
//si la request ya trae Authorization (ej: logout) no la pisa
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).tokenActual;

  if (!token || !req.url.startsWith(environment.apiUrl) || req.headers.has('Authorization')) {
    return next(req);
  }

  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
