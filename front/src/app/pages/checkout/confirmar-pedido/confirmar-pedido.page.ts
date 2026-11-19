import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { NgbAlert, NgbCollapse } from '@ng-bootstrap/ng-bootstrap';

import { CartService } from '../../../services/cart.service';
import {
  AddressesService,
  CrearDireccionBody,
  Direccion,
  tieneUbicacion,
} from '../../../services/addresses.service';
import { OrdersService, Pedido } from '../../../services/orders.service';
import { mensajeDeError } from '../../../services/api-error';
import { FormularioDireccionComponent } from '../../../components/formulario-direccion/formulario-direccion.component';

@Component({
  selector: 'app-confirmar-pedido',
  imports: [CurrencyPipe, RouterLink, NgbAlert, NgbCollapse, FormularioDireccionComponent],
  templateUrl: './confirmar-pedido.page.html',
  styleUrl: './confirmar-pedido.page.css',
})
export class ConfirmarPedidoPage {
  readonly #cartService = inject(CartService);
  readonly #addressesService = inject(AddressesService);
  readonly #ordersService = inject(OrdersService);

  protected readonly tieneUbicacion = tieneUbicacion;
  protected readonly mensajeDeError = mensajeDeError;

  protected readonly carrito = rxResource({ stream: () => this.#cartService.obtener() });
  protected readonly direcciones = rxResource({ stream: () => this.#addressesService.listar() });

  protected readonly cargando = computed(
    () =>
      (this.carrito.isLoading() && !this.carrito.hasValue()) ||
      (this.direcciones.isLoading() && !this.direcciones.hasValue()),
  );

  //se preselecciona la primera con el punto en el mapa. si la lista cambia se mantiene
  //la elegida mientras siga existiendo
  protected readonly direccionSeleccionadaId = linkedSignal<Direccion[] | undefined, number | null>({
    //value() tira error si el resource fallo, por eso se chequea hasValue antes
    source: () => (this.direcciones.hasValue() ? this.direcciones.value() : undefined),
    computation: (lista, anterior) => {
      if (anterior?.value != null && lista?.some((d) => d.id === anterior.value)) {
        return anterior.value;
      }
      return lista?.find(tieneUbicacion)?.id ?? null;
    },
  });

  //cantidad de unidades, igual que en el carrito y en mis pedidos
  protected readonly cantidadProductos = computed(
    () =>
      this.carrito.hasValue()
        ? this.carrito.value().items.reduce((total, item) => total + item.cantidad, 0)
        : 0,
  );

  //el formulario de nueva direccion se abre y cierra con NgbCollapse
  protected readonly formularioColapsado = signal(true);
  protected readonly guardandoDireccion = signal(false);
  protected readonly confirmandoPedido = signal(false);

  protected readonly error = signal<string | null>(null);
  protected readonly pedidoCreado = signal<Pedido | null>(null);

  protected seleccionarDireccion(id: number): void {
    this.direccionSeleccionadaId.set(id);
  }

  protected async crearDireccion(datos: CrearDireccionBody): Promise<void> {
    this.error.set(null);
    this.guardandoDireccion.set(true);
    try {
      const direccion = await firstValueFrom(this.#addressesService.crear(datos));
      this.direcciones.value.update((lista) => [...(lista ?? []), direccion]);
      this.direccionSeleccionadaId.set(direccion.id);
      this.formularioColapsado.set(true);
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.guardandoDireccion.set(false);
    }
  }

  protected async confirmarPedido(): Promise<void> {
    this.error.set(null);

    const carrito = this.carrito.hasValue() ? this.carrito.value() : undefined;
    if (!carrito || carrito.items.length === 0) {
      this.error.set('Tu carrito está vacío.');
      return;
    }

    const direccionId = this.direccionSeleccionadaId();
    if (!direccionId) {
      this.error.set('Seleccioná una dirección de entrega.');
      return;
    }

    const seleccionada = this.direcciones.hasValue()
      ? this.direcciones.value().find((d) => d.id === direccionId)
      : undefined;
    if (seleccionada && !tieneUbicacion(seleccionada)) {
      this.error.set(
        'Esa dirección no tiene la ubicación marcada en el mapa. Editala en Mis direcciones.',
      );
      return;
    }

    this.confirmandoPedido.set(true);
    try {
      const pedido = await firstValueFrom(
        this.#ordersService.crear({ direccionId, metodoPago: 'pos' }),
      );
      this.pedidoCreado.set(pedido);
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.confirmandoPedido.set(false);
    }
  }
}
