import { Routes } from '@angular/router';

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
    loadComponent: () => import('./pages/perfil/mis-direcciones/mis-direcciones.page'),
  },
];

export default perfilRoutes;