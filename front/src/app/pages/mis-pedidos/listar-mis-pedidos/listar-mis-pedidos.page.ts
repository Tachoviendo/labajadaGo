import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { OrdersService, Pedido, EstadoPedido } from '../../../services/orders.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-listar-mis-pedidos',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './listar-mis-pedidos.page.html',
  styleUrl: './listar-mis-pedidos.page.css',
})
export class ListarMisPedidosPage implements OnInit {
  private readonly ordersService = inject(OrdersService);
  private readonly cdr = inject(ChangeDetectorRef);

  pedidos: Pedido[] = [];
  cargando = true;
  error = '';
  mensajeExito = '';
  pedidoSeleccionadoId: number | null = null;
  cancelandoId: number | null = null;

  ngOnInit(): void {
    this.cargarPedidos();
  }

  cargarPedidos(): void {
    this.cargando = true;
    this.error = '';

    this.ordersService.listar().subscribe({
      next: (pedidos) => {
        this.pedidos = pedidos;
        this.cargando = false;
        this.cdr.markForCheck();
      },
      error: (error: HttpErrorResponse) => {
        this.error = error.error?.message || 'No se pudieron cargar tus pedidos.';
        this.cargando = false;
        this.cdr.markForCheck();
      },
    });
  }

  toggleDetalle(pedidoId: number): void {
    this.pedidoSeleccionadoId = this.pedidoSeleccionadoId === pedidoId ? null : pedidoId;
  }

  estaExpandido(pedidoId: number): boolean {
    return this.pedidoSeleccionadoId === pedidoId;
  }

  puedeCancelar(pedido: Pedido): boolean {
    return ['realizado', 'preparando'].includes(pedido.estado);
  }

  cancelarPedido(pedido: Pedido): void {
    if (!this.puedeCancelar(pedido) || this.cancelandoId !== null) {
      return;
    }

    const confirmar = window.confirm(
      `¿Estás seguro de que querés cancelar el pedido #${pedido.id}?`,
    );

    if (!confirmar) return;

    this.cancelandoId = pedido.id;
    this.error = '';
    this.mensajeExito = '';

    this.ordersService.cancelar(pedido.id).subscribe({
      next: () => {
        this.cancelandoId = null;
        this.mensajeExito = `El pedido #${pedido.id} fue cancelado.`;
        this.cargarPedidos();
        this.cdr.markForCheck();
      },
      error: (error: HttpErrorResponse) => {
        this.cancelandoId = null;
        this.error = error.error?.message || 'No se pudo cancelar el pedido.';
        this.cdr.markForCheck();
      },
    });
  }

  nombreEstado(estado: EstadoPedido): string {
    const nombres: Record<EstadoPedido, string> = {
      realizado: 'Realizado',
      preparando: 'Preparando',
      en_reparto: 'En reparto',
      entregado: 'Entregado',
      cancelado: 'Cancelado',
    };

    return nombres[estado];
  }

  claseEstado(estado: EstadoPedido): string {
    const clases: Record<EstadoPedido, string> = {
      realizado: 'estado-realizado',
      preparando: 'estado-preparando',
      en_reparto: 'estado-reparto',
      entregado: 'estado-entregado',
      cancelado: 'estado-cancelado',
    };

    return clases[estado];
  }

  nombreMetodoPago(metodo: Pedido['metodoPago']): string {
    return metodo === 'pos' ? 'Pago al recibir el pedido' : 'MercadoPago';
  }

  calcularCantidadProductos(pedido: Pedido): number {
    return pedido.items.reduce((total, item) => total + item.cantidad, 0);
  }
}

export default ListarMisPedidosPage;
