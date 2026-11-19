import { Component, computed, input } from '@angular/core';

import { EstadoPedido } from '../../services/orders.service';

const NOMBRES: Record<EstadoPedido, string> = {
  realizado: 'Realizado',
  preparando: 'Preparando',
  en_reparto: 'En reparto',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

//etiqueta de color con el estado de un pedido. se reusa en pedidos entrantes,
//gestionar pedido y las pantallas del repartidor:
//  <app-estado-pedido [estado]="pedido.estado" />
@Component({
  selector: 'app-estado-pedido',
  template: `<span class="badge" [class]="estado()">{{ nombre() }}</span>`,
  styles: `
    .badge {
      display: inline-block;
      padding: 0.2rem 0.7rem;
      border-radius: 1rem;
      font-size: 0.8rem;
      font-weight: 600;
      white-space: nowrap;
    }
    .realizado { color: #174a7e; background: #e3efff; }
    .preparando { color: #8a5700; background: #fff1cc; }
    .en_reparto { color: #6641a5; background: #eee5ff; }
    .entregado { color: #176b3a; background: #dff5e7; }
    .cancelado { color: #a52b35; background: #ffe3e5; }
  `,
})
export class EstadoPedidoComponent {
  readonly estado = input.required<EstadoPedido>();
  protected readonly nombre = computed(() => NOMBRES[this.estado()]);
}
