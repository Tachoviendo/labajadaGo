import { Routes } from '@angular/router';
import { rolGuard } from './guards/auth.guard';

//admin.routes ya exige cajero o dueno (ver app.routes), aca se restringe lo que es solo del dueño
const soloDueno = [rolGuard('dueno')];

export const adminRoutes: Routes = [
  //solo dueño
  {
    path: '',
    pathMatch: 'full',
    title: 'Panel',
    canActivate: soloDueno,
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
    canActivate: soloDueno,
    loadComponent: () => import('./pages/admin/productos/admin-productos/admin-productos.page'),
  },
  {
    //alta y edicion usan la misma pagina. 'nuevo' va antes que ':id'
    path: 'productos/nuevo',
    title: 'Nuevo producto',
    canActivate: soloDueno,
    loadComponent: () => import('./pages/admin/productos/alta-edicion-producto/alta-edicion-producto.page'),
  },
  {
    path: 'productos/:id',
    title: 'Editar producto',
    canActivate: soloDueno,
    loadComponent: () => import('./pages/admin/productos/alta-edicion-producto/alta-edicion-producto.page'),
  },
  {
    path: 'categorias',
    title: 'Categorías',
    canActivate: soloDueno,
    loadComponent: () => import('./pages/admin/categorias/admin-categorias/admin-categorias.page'),
  },
    {
    path: 'usuarios',
    title: 'Usuarios',
    canActivate: soloDueno,
    loadComponent: () => import('./pages/admin/usuarios/usuarios-internos/usuarios-internos.page'),
  },
  {
    path: 'usuarios/nuevo',
    title: 'Nuevo usuario',
    canActivate: soloDueno,
    loadComponent: () => import('./pages/admin/usuarios/alta-usuario/alta-usuario.page'),
  },
];

export default adminRoutes;