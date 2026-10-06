import { Routes } from '@angular/router';
import { InicioPage } from './pages/inicio/inicio.page';

export const routes: Routes = [
  //EAGER LOADING:
  { path: '', pathMatch: 'full', title: 'Inicio', component: InicioPage },

  //LAZY LOADING:
  //publicas
  {
    path: 'login',
    title: 'Login',
    loadComponent: () => import('./pages/auth/login/login.page'),
  },
  {
    path: 'registro',
    title: 'Registro',
    loadComponent: () => import('./pages/auth/registro/registro.page'),
  },
  {
    path: 'recuperar',
    title: 'Recuperar contraseña',
    loadComponent: () => import('./pages/auth/recuperar-password/recuperar-password.page'),
  },
  {
    //LAZY LOADING de otro archivo de rutas dentro de /productos
    path: 'productos',
    loadChildren: () => import('./productos.routes'),
  },

  //cliente
  {
    path: 'carrito',
    title: 'Carrito',
    loadComponent: () => import('./pages/carrito/ver-carrito/ver-carrito.page'),
  },
  {
    path: 'checkout',
    title: 'Checkout',
    loadComponent: () => import('./pages/checkout/confirmar-pedido/confirmar-pedido.page'),
  },
  {
    path: 'mis-pedidos',
    loadChildren: () => import('./mis-pedidos.routes'),
  },
  {
    path: 'perfil',
    loadChildren: () => import('./perfil.routes'),
  },

  //cajero y dueño
  {
    path: 'admin',
    loadChildren: () => import('./admin.routes'),
  },

  //cualquier ruta que no exista
  {
    path: '**',
    title: 'No encontrado',
    loadComponent: () => import('./pages/not-found/not-found.page'),
  },
];