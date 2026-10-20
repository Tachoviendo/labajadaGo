import { Routes } from '@angular/router';
import { rolGuard } from './guards/auth.guard';

export const perfilRoutes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Mi perfil',
    loadComponent: () => import('./pages/perfil/mi-perfil/mi-perfil.page'),
  },
  {
    path: 'direcciones',
    title: 'Mis direcciones',
    //las direcciones son solo del cliente (igual que en la api)
    canActivate: [rolGuard('cliente')],
    loadComponent: () => import('./pages/perfil/mis-direcciones/mis-direcciones.page'),
  },
];

export default perfilRoutes;