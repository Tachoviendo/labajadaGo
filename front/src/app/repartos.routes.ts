import { Routes } from '@angular/router';

//todo esto ya exige rol repartidor (ver app.routes)
export const repartosRoutes: Routes = [
  {
    //pedidos listos para recoger + el reparto en curso, si tiene uno
    path: '',
    pathMatch: 'full',
    title: 'Repartos',
    loadComponent: () => import('./pages/repartos/disponibles/disponibles.page'),
  },
  {
    //el mismo tablero kanban del cajero, con las acciones del repartidor.
    //va antes de ':id_pedido' para que 'tablero' no se tome como un id
    path: 'tablero',
    title: 'Tablero de pedidos',
    loadComponent: () => import('./pages/admin/pedidos/pedidos-entrantes/pedidos-entrantes.page'),
  },
  {
    //el pedido que esta llevando: mapa, ubicacion en vivo y entregar con foto
    path: ':id_pedido',
    title: 'Mi reparto',
    loadComponent: () => import('./pages/repartos/mi-reparto/mi-reparto.page'),
  },
];

export default repartosRoutes;
