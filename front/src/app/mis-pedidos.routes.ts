import { Routes } from '@angular/router';

export const misPedidosRoutes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Mis pedidos',
    loadComponent: () => import('./pages/mis-pedidos/listar-mis-pedidos/listar-mis-pedidos.page'),
  },
  {
    path: ':id',
    title: 'Detalle de mi pedido',
    loadComponent: () => import('./pages/mis-pedidos/detalle-mi-pedido/detalle-mi-pedido.page'),
  },
];

export default misPedidosRoutes;