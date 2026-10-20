import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { Rol } from '../models/auth.model';
import { AuthService } from '../services/auth.service';

//sin sesion -> al login, guardando la pagina que se queria ver para volver despues
function irAlLogin(url: string) {
  return inject(Router).createUrlTree(['/login'], { queryParams: { returnUrl: url } });
}

//cualquier usuario logueado
export const authGuard: CanActivateFn = (_route, state) => {
  return inject(AuthService).estaAutenticado || irAlLogin(state.url);
};

//usuario logueado con alguno de los roles (mismos permisos que authorize() en la api)
export function rolGuard(...roles: Rol[]): CanActivateFn {
  return (_route, state) => {
    const authService = inject(AuthService);
    if (!authService.estaAutenticado) {
      return irAlLogin(state.url);
    }
    return authService.tieneRol(...roles) || inject(Router).createUrlTree(['/sin-permisos']);
  };
}
