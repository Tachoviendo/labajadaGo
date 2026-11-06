import { CurrencyPipe } from '@angular/common';
import { Component, inject, resource, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonIcon,
  IonNote,
  IonSpinner,
  IonText,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { addOutline, cartOutline, removeOutline, trashOutline } from 'ionicons/icons';

import { ItemCarrito } from '../../../models/carrito.model';
import { mensajeDeError } from '../../../services/api-error';
import { CarritoService } from '../../../services/carrito.service';

@Component({
  selector: 'app-ver-carrito',
  imports: [
    CurrencyPipe,
    RouterLink,
    IonButton,
    IonCard,
    IonCardContent,
    IonIcon,
    IonNote,
    IonSpinner,
    IonText,
  ],
  templateUrl: './ver-carrito.page.html',
  styleUrl: './ver-carrito.page.css',
})
export class VerCarritoPage {
  readonly #carritoService = inject(CarritoService);

  protected readonly carrito = resource({
    loader: () => this.#carritoService.obtener(),
  });

  //producto que se esta modificando, para deshabilitar sus botones mientras tanto
  protected readonly modificando = signal<number | null>(null);
  protected readonly mensajeError = signal<string | null>(null);

  constructor() {
    addIcons({ addOutline, cartOutline, removeOutline, trashOutline });
  }

  //el producto ya no se puede comprar en esa cantidad (se desactivo o bajo el stock)
  protected sinDisponibilidad(item: ItemCarrito) {
    return !item.producto.activo || item.producto.stock < item.cantidad;
  }

  protected hayItemsSinDisponibilidad() {
    return this.carrito.value()?.items.some((item) => this.sinDisponibilidad(item)) ?? false;
  }

  protected cambiarCantidad(item: ItemCarrito, cantidad: number) {
    if (cantidad < 1) return;
    this.modificar(item, () => this.#carritoService.cambiarCantidad(item.producto.id, cantidad));
  }

  protected quitar(item: ItemCarrito) {
    this.modificar(item, () => this.#carritoService.quitar(item.producto.id));
  }

  protected mensajeDeError(error: unknown) {
    return mensajeDeError(error);
  }

  //la api recalcula subtotales y total, asi que despues de cada cambio se vuelve a pedir el carrito
  private async modificar(item: ItemCarrito, operacion: () => Promise<unknown>) {
    this.mensajeError.set(null);
    this.modificando.set(item.producto.id);
    try {
      await operacion();
      this.carrito.reload();
    } catch (error) {
      this.mensajeError.set(mensajeDeError(error));
    } finally {
      this.modificando.set(null);
    }
  }
}

export default VerCarritoPage;
