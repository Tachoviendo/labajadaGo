import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, TemplateRef, computed, inject, input, numberAttribute, resource, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgbAlert, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { firstValueFrom } from 'rxjs';

import { EstadoPedidoComponent } from '../../../../components/estado-pedido/estado-pedido.component';
import { RolInterno } from '../../../../models/usuario.model';
import { UrlPublicaPipe } from '../../../../pipes/url-publica.pipe';
import { mensajeDeError } from '../../../../services/api-error';
import { AuthService } from '../../../../services/auth.service';
import { OrdersService, Pedido } from '../../../../services/orders.service';
import { EstadoTablero, Movimiento, movimientosPara, puedeCancelar } from '../movimientos';

//detalle de un pedido para el cajero y el dueño: datos del cliente, productos, historial
//de estados y las acciones que le permite su rol (mover de estado y cancelar)
@Component({
  selector: 'app-gestionar-pedido',
  imports: [RouterLink, CurrencyPipe, DatePipe, NgbAlert, EstadoPedidoComponent, UrlPublicaPipe],
  templateUrl: './gestionar-pedido.page.html',
  styleUrl: './gestionar-pedido.page.css',
})
export class GestionarPedidoPage {
  readonly #ordersService = inject(OrdersService);
  readonly #modal = inject(NgbModal);

  //:id_pedido de la ruta. llega como texto y se pasa a numero
  readonly idPedido = input.required({ alias: 'id_pedido', transform: numberAttribute });

  protected readonly rol = (inject(AuthService).usuarioActual?.rol ?? 'cajero') as RolInterno;

  protected readonly pedido = resource({
    params: () => ({ id: this.idPedido() }),
    loader: ({ params }) => firstValueFrom(this.#ordersService.obtener(params.id)),
  });

  protected readonly historial = resource({
    params: () => ({ id: this.idPedido() }),
    loader: ({ params }) => firstValueFrom(this.#ordersService.historial(params.id)),
  });

  //el cliente es quien hizo el pedido (primer cambio, 'realizado')
  protected readonly cliente = computed(() => {
    if (!this.historial.hasValue()) return null;
    return this.historial.value().find((cambio) => cambio.estado === 'realizado')?.usuario ?? null;
  });

  //el repartidor: el ultimo que lo saco a reparto (si se devolvio, puede haber varios)
  protected readonly repartidor = computed(() => {
    if (!this.historial.hasValue()) return null;
    const salidas = this.historial.value().filter((cambio) => cambio.estado === 'en_reparto');
    return salidas.at(-1)?.usuario ?? null;
  });

  protected readonly movimientos = computed<Movimiento[]>(() =>
    this.pedido.hasValue() ? movimientosPara(this.rol, this.pedido.value()) : [],
  );
  protected readonly sePuedeCancelar = computed(
    () => this.pedido.hasValue() && puedeCancelar(this.rol, this.pedido.value()),
  );

  protected readonly ocupado = signal(false);
  protected readonly mensajeExito = signal<string | null>(null);
  protected readonly mensajeError = signal<string | null>(null);

  protected async mover(movimiento: Movimiento) {
    if (movimiento.destino === 'entregado' && !confirm('¿Marcar como entregado? No se puede deshacer.')) {
      return;
    }
    await this.cambiarEstado(movimiento.destino, `Pasó a "${movimiento.texto.toLowerCase()}".`);
  }

  //modal de ng-bootstrap con un <ng-template>. result se resuelve con modal.close() y se
  //rechaza con modal.dismiss() (cerrar, Esc o click afuera)
  protected async confirmarCancelacion(contenido: TemplateRef<unknown>) {
    try {
      await this.#modal.open(contenido, { centered: true }).result;
    } catch {
      return; //no confirmo
    }
    await this.cambiarEstado('cancelado', 'El pedido fue cancelado y se devolvió el stock.');
  }

  protected mensajeDeError(error: unknown) {
    return mensajeDeError(error);
  }

  protected cantidadProductos(pedido: Pedido) {
    return pedido.items.reduce((total, item) => total + item.cantidad, 0);
  }

  private async cambiarEstado(estado: EstadoTablero | 'cancelado', exito: string) {
    if (this.ocupado()) return;
    this.ocupado.set(true);
    this.mensajeExito.set(null);
    this.mensajeError.set(null);
    try {
      const actualizado = await firstValueFrom(this.#ordersService.cambiarEstado(this.idPedido(), estado));
      //la api devuelve el pedido ya cambiado: se muestra sin volver a pedirlo
      this.pedido.set(actualizado);
      this.historial.reload();
      this.mensajeExito.set(exito);
    } catch (error) {
      //409 (ej: ya esta pago, u otro lo movio antes): se muestra y se refresca
      this.mensajeError.set(mensajeDeError(error));
      this.pedido.reload();
      this.historial.reload();
    } finally {
      this.ocupado.set(false);
    }
  }
}

export default GestionarPedidoPage;
