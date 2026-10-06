import { Routes } from '@angular/router';

export const productosRoutes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Catálogo',
    loadComponent: () => import('./pages/productos/listar-productos/listar-productos.page'),
  },
  {
    path: ':id',
    title: 'Detalle de producto',
    loadComponent: () => import('./pages/productos/detalle-producto/detalle-producto.page'),
  },
];

export default productosRoutes;