import { CurrencyPipe, DatePipe, NgClass } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { NgbAlert, NgbCollapse } from '@ng-bootstrap/ng-bootstrap';

import { OrdersService, Pedido, EstadoPedido } from '../../../services/orders.service';
import { mensajeDeError } from '../../../services/api-error';
import { NotificacionesService } from '../../../services/notificaciones.service';
import { ConfirmacionService } from '../../../services/confirmacion.service';

const NOMBRES_ESTADO: Record<EstadoPedido, string> = {
  realizado: 'Realizado',
  preparando: 'Preparando',
  en_reparto: 'En reparto',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

const CLASES_ESTADO: Record<EstadoPedido, string> = {
  realizado: 'estado-realizado',
  preparando: 'estado-preparando',
  en_reparto: 'estado-reparto',
  entregado: 'estado-entregado',
  cancelado: 'estado-cancelado',
};

@Component({
  selector: 'app-listar-mis-pedidos',
  imports: [RouterLink, CurrencyPipe, DatePipe, NgClass, NgbAlert, NgbCollapse],
  templateUrl: './listar-mis-pedidos.page.html',
  styleUrl: './listar-mis-pedidos.page.css',
})
export class ListarMisPedidosPage {
  readonly #ordersService = inject(OrdersService);
  readonly #confirmacion = inject(ConfirmacionService);
  readonly #notificaciones = inject(NotificacionesService);

  protected readonly mensajeDeError = mensajeDeError;

  protected readonly pedidos = rxResource({
    stream: () => this.#ordersService.listar(),
  });

  protected readonly errorAccion = signal<string | null>(null);
  //pedido con el detalle desplegado (NgbCollapse)
  protected readonly pedidoSeleccionadoId = signal<number | null>(null);
  protected readonly cancelandoId = signal<number | null>(null);

  protected toggleDetalle(pedidoId: number): void {
    this.pedidoSeleccionadoId.update((actual) => (actual === pedidoId ? null : pedidoId));
  }

  protected puedeCancelar(pedido: Pedido): boolean {
    return pedido.estado === 'realizado' || pedido.estado === 'preparando';
  }

  protected async cancelarPedido(pedido: Pedido): Promise<void> {
    if (!this.puedeCancelar(pedido) || this.cancelandoId() !== null) {
      return;
    }

    const confirmado = await this.#confirmacion.preguntar({
      titulo: `¿Cancelar el pedido #${pedido.id}?`,
      mensaje: 'No se puede deshacer.',
      textoConfirmar: 'Sí, cancelar',
      textoCancelar: 'No',
      peligro: true,
    });
    if (!confirmado) return;

    this.cancelandoId.set(pedido.id);
    this.errorAccion.set(null);
    try {
      await firstValueFrom(this.#ordersService.cancelar(pedido.id));
      this.#notificaciones.exito(`El pedido #${pedido.id} fue cancelado.`);
      this.pedidos.reload();
    } catch (error) {
      this.errorAccion.set(mensajeDeError(error));
    } finally {
      this.cancelandoId.set(null);
    }
  }

  protected nombreEstado(estado: EstadoPedido): string {
    return NOMBRES_ESTADO[estado];
  }

  protected claseEstado(estado: EstadoPedido): string {
    return CLASES_ESTADO[estado];
  }

  protected nombreMetodoPago(metodo: Pedido['metodoPago']): string {
    return metodo === 'pos' ? 'Pago al recibir el pedido' : 'MercadoPago';
  }

  protected calcularCantidadProductos(pedido: Pedido): number {
    return pedido.items.reduce((total, item) => total + item.cantidad, 0);
  }
}

export default ListarMisPedidosPage;
