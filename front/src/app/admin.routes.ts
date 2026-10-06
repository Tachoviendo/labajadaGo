import { Routes } from '@angular/router';

export const adminRoutes: Routes = [
  //solo dueño
  {
    path: '',
    pathMatch: 'full',
    title: 'Panel',
    loadComponent: () => import('./pages/admin/panel/panel.page'),
  },

  //cajero y dueño
  {
    path: 'pedidos',
    title: 'Pedidos entrantes',
    loadComponent: () => import('./pages/admin/pedidos/pedidos-entrantes/pedidos-entrantes.page'),
  },
  {
    path: 'pedidos/:id',
    title: 'Gestionar pedido',
    loadComponent: () => import('./pages/admin/pedidos/gestionar-pedido/gestionar-pedido.page'),
  },

  //solo dueño
  {
    path: 'productos',
    title: 'Productos',
    loadComponent: () => import('./pages/admin/productos/admin-productos/admin-productos.page'),
  },
  {
    //alta y edicion usan la misma pagina. 'nuevo' va antes que ':id'
    path: 'productos/nuevo',
    title: 'Nuevo producto',
    loadComponent: () => import('./pages/admin/productos/alta-edicion-producto/alta-edicion-producto.page'),
  },
  {
    path: 'productos/:id',
    title: 'Editar producto',
    loadComponent: () => import('./pages/admin/productos/alta-edicion-producto/alta-edicion-producto.page'),
  },
  {
    path: 'categorias',
    title: 'Categorías',
    loadComponent: () => import('./pages/admin/categorias/admin-categorias/admin-categorias.page'),
  },
  {
    path: 'usuarios',
    title: 'Usuarios internos',
    loadComponent: () => import('./pages/admin/usuarios/usuarios-internos/usuarios-internos.page'),
  },
];

export default adminRoutes;