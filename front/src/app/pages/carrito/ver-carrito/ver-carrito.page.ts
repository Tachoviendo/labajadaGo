import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { NgbAlert } from '@ng-bootstrap/ng-bootstrap';

import { UrlPublicaPipe } from '../../../pipes/url-publica.pipe';
import { mensajeDeError } from '../../../services/api-error';
import { CartService, ItemCarrito } from '../../../services/cart.service';
import { ConfirmacionService } from '../../../services/confirmacion.service';

@Component({
  selector: 'app-ver-carrito',
  imports: [CurrencyPipe, RouterLink, UrlPublicaPipe, NgbAlert],
  templateUrl: './ver-carrito.page.html',
  styleUrl: './ver-carrito.page.css',
})
export class VerCarritoPage {
  readonly #cartService = inject(CartService);
  readonly #confirmacion = inject(ConfirmacionService);

  protected readonly imagenPorDefecto = '/imagenes/imagendeproductos.png';

  protected readonly carrito = rxResource({
    stream: () => this.#cartService.obtener(),
  });

  //error de una accion (cambiar cantidad o eliminar), el de la carga lo tiene el resource
  protected readonly errorAccion = signal<string | null>(null);

  protected readonly actualizandoId = signal<number | null>(null);
  protected readonly eliminandoId = signal<number | null>(null);
  protected readonly ocupado = computed(
    () => this.actualizandoId() !== null || this.eliminandoId() !== null,
  );

  protected readonly cantidadProductos = computed(
    () =>
      this.carrito.hasValue()
        ? this.carrito.value().items.reduce((total, item) => total + item.cantidad, 0)
        : 0,
  );

  protected readonly mensajeDeError = mensajeDeError;

  protected async cambiarCantidad(item: ItemCarrito, cambio: number): Promise<void> {
    const nuevaCantidad = item.cantidad + cambio;
    if (this.ocupado() || nuevaCantidad < 1 || nuevaCantidad > item.producto.stock) {
      return;
    }

    this.actualizandoId.set(item.producto.id);
    this.errorAccion.set(null);
    try {
      await firstValueFrom(this.#cartService.actualizar(item.producto.id, nuevaCantidad));
      this.carrito.reload();
    } catch (error) {
      this.errorAccion.set(mensajeDeError(error));
    } finally {
      this.actualizandoId.set(null);
    }
  }

  protected async eliminar(item: ItemCarrito): Promise<void> {
    if (this.ocupado()) {
      return;
    }

    const confirmado = await this.#confirmacion.preguntar({
      titulo: `¿Quitar ${item.producto.nombre} del carrito?`,
      textoConfirmar: 'Quitar',
      peligro: true,
    });
    if (!confirmado) return;

    this.eliminandoId.set(item.producto.id);
    this.errorAccion.set(null);
    try {
      await firstValueFrom(this.#cartService.eliminar(item.producto.id));
      this.carrito.reload();
    } catch (error) {
      this.errorAccion.set(mensajeDeError(error));
    } finally {
      this.eliminandoId.set(null);
    }
  }
}

export default VerCarritoPage;
