import { CurrencyPipe } from '@angular/common';
import { Component, inject, linkedSignal, resource, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonRadio,
  IonRadioGroup,
  IonSpinner,
  IonText,
} from '@ionic/angular';

import { MetodoPago } from '../../../models/pedido.model';
import { mensajeDeError } from '../../../services/api-error';
import { CarritoService } from '../../../services/carrito.service';
import { DireccionesService } from '../../../services/direcciones.service';
import { PedidosService } from '../../../services/pedidos.service';

@Component({
  selector: 'app-confirmar-pedido',
  imports: [
    CurrencyPipe,
    RouterLink,
    IonButton,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardTitle,
    IonItem,
    IonLabel,
    IonList,
    IonNote,
    IonRadio,
    IonRadioGroup,
    IonSpinner,
    IonText,
  ],
  templateUrl: './confirmar-pedido.page.html',
  styleUrl: './confirmar-pedido.page.css',
})
export class ConfirmarPedidoPage {
  readonly #carritoService = inject(CarritoService);
  readonly #direccionesService = inject(DireccionesService);
  readonly #pedidosService = inject(PedidosService);
  readonly #router = inject(Router);

  protected readonly carrito = resource({
    loader: () => this.#carritoService.obtener(),
  });

  protected readonly direcciones = resource({
    loader: () => this.#direccionesService.listar(),
  });

  //arranca con la primera direccion elegida y despues la cambia el usuario
  protected readonly direccionId = linkedSignal<number | null>(
    () => (this.direcciones.hasValue() ? this.direcciones.value()[0]?.id ?? null : null),
  );

  //MercadoPago todavia no esta integrado en la api, por ahora solo se ofrece POS
  protected readonly metodoPago = signal<MetodoPago>('pos');

  protected readonly confirmando = signal(false);
  protected readonly mensajeError = signal<string | null>(null);

  protected elegirDireccion(event: CustomEvent) {
    this.direccionId.set(event.detail.value);
  }

  protected elegirMetodo(event: CustomEvent) {
    this.metodoPago.set(event.detail.value);
  }

  protected async confirmar() {
    const direccionId = this.direccionId();
    if (direccionId === null) return;

    this.mensajeError.set(null);
    this.confirmando.set(true);
    try {
      const pedido = await this.#pedidosService.crear({
        direccionId,
        metodoPago: this.metodoPago(),
      });
      await this.#router.navigate(['/mis-pedidos', pedido.id], { queryParams: { nuevo: 1 } });
    } catch (error) {
      //ej: un producto se quedo sin stock mientras tanto (409)
      this.mensajeError.set(mensajeDeError(error));
      this.carrito.reload();
    } finally {
      this.confirmando.set(false);
    }
  }

  protected mensajeDeError(error: unknown) {
    return mensajeDeError(error);
  }
}

export default ConfirmarPedidoPage;
