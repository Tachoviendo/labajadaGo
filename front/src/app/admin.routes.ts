import { Routes } from '@angular/router';
import { rolGuard } from './guards/auth.guard';

//admin.routes ya exige cajero o dueno (ver app.routes), aca se restringe lo que es solo del dueño
const soloDueno = [rolGuard('dueno')];

export const adminRoutes: Routes = [
  //no hay panel: /admin lleva directo al tablero de pedidos
  { path: '', pathMatch: 'full', redirectTo: 'pedidos' },

  //cajero y dueño
  {
    path: 'pedidos',
    title: 'Pedidos entrantes',
    loadComponent: () => import('./pages/admin/pedidos/pedidos-entrantes/pedidos-entrantes.page'),
  },
  {
    //:id_pedido llega como input() a la pagina (withComponentInputBinding en app.config)
    path: 'pedidos/:id_pedido',
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
    //:id_producto llega como input() a la pagina (withComponentInputBinding en app.config)
    path: 'productos/:id_producto',
    title: 'Editar producto',
    canActivate: soloDueno,
    loadComponent: () => import('./pages/admin/productos/alta-edicion-producto/alta-edicion-producto.page'),
  },
  {
    //HU-25: ventas del periodo, pedidos por estado y mas vendidos
    path: 'estadisticas',
    title: 'Estadísticas',
    canActivate: soloDueno,
    loadComponent: () => import('./pages/admin/estadisticas/estadisticas.page'),
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