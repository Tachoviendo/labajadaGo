import { Component, computed, inject, input, numberAttribute, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { NgbAlert } from '@ng-bootstrap/ng-bootstrap';

import { ProductsService } from '../../../services/products.service';
import { CartService } from '../../../services/cart.service';
import { AuthService } from '../../../services/auth.service';
import { mensajeDeError } from '../../../services/api-error';
import { UrlPublicaPipe } from '../../../pipes/url-publica.pipe';

@Component({
  selector: 'app-detalle-producto',
  imports: [CurrencyPipe, RouterLink, UrlPublicaPipe, NgbAlert],
  templateUrl: './detalle-producto.page.html',
  styleUrl: './detalle-producto.page.css',
})
export class DetalleProductoPage {
  readonly #productsService = inject(ProductsService);
  readonly #cartService = inject(CartService);
  readonly #authService = inject(AuthService);

  //:id de la ruta (withComponentInputBinding). NaN si no es un numero
  readonly id = input.required({ transform: numberAttribute });

  protected readonly idValido = computed(() => Number.isInteger(this.id()) && this.id() > 0);

  protected readonly esCliente = computed(() => this.#authService.usuario()?.rol === 'cliente');

  //si el id no es valido params devuelve undefined y el resource no pide nada
  protected readonly producto = rxResource({
    params: () => (this.idValido() ? this.id() : undefined),
    stream: ({ params: id }) => this.#productsService.obtener(id),
  });

  protected readonly agregando = signal(false);
  protected readonly mensaje = signal<{ tipo: 'success' | 'danger'; texto: string } | null>(null);

  protected readonly mensajeDeError = mensajeDeError;

  protected async agregarAlCarrito(): Promise<void> {
    const producto = this.producto.hasValue() ? this.producto.value() : undefined;
    if (!producto || !this.esCliente() || producto.stock <= 0 || this.agregando()) {
      return;
    }

    this.agregando.set(true);
    this.mensaje.set(null);
    try {
      await firstValueFrom(this.#cartService.agregar(producto.id, 1));
      this.mensaje.set({ tipo: 'success', texto: 'El producto se agregó correctamente al carrito.' });
    } catch (error) {
      this.mensaje.set({ tipo: 'danger', texto: mensajeDeError(error) });
    } finally {
      this.agregando.set(false);
    }
  }
}

export default DetalleProductoPage;
