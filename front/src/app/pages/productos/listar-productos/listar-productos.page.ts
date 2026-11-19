import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { form, FormField } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';
import { NgbPagination } from '@ng-bootstrap/ng-bootstrap';

import { FiltrosProductos, Producto } from '../../../models/product.model';

import { ProductsService } from '../../../services/products.service';
import { CategoriesService } from '../../../services/categories.service';
import { CartService } from '../../../services/cart.service';
import { AuthService } from '../../../services/auth.service';
import { NotificacionesService } from '../../../services/notificaciones.service';
import { mensajeDeError } from '../../../services/api-error';
import { UrlPublicaPipe } from '../../../pipes/url-publica.pipe';

const LIMITE = 8;

@Component({
  selector: 'app-listar-productos',
  imports: [FormField, RouterLink, CurrencyPipe, UrlPublicaPipe, NgbPagination],
  templateUrl: './listar-productos.page.html',
  styleUrl: './listar-productos.page.css',
})
export class ListarProductosPage {
  readonly #productsService = inject(ProductsService);
  readonly #categoriesService = inject(CategoriesService);
  readonly #cartService = inject(CartService);
  readonly #authService = inject(AuthService);
  readonly #notificaciones = inject(NotificacionesService);

  protected readonly limite = LIMITE;
  protected readonly mensajeDeError = mensajeDeError;

  protected readonly esCliente = computed(() => this.#authService.usuario()?.rol === 'cliente');

  //formulario de filtros (signal forms). la categoria filtra apenas cambia;
  //la busqueda se aplica al tocar "Buscar" o Enter, para no pedir a la api en cada tecla
  protected readonly filtrosModel = signal({ busqueda: '', categoriaId: '' });
  protected readonly filtrosForm = form(this.filtrosModel);

  protected readonly busquedaAplicada = signal('');

  //si cambia un filtro se vuelve a la pagina 1 (linkedSignal se resetea cuando cambia su source)
  protected readonly pagina = linkedSignal({
    source: () => [this.busquedaAplicada(), this.filtrosModel().categoriaId],
    computation: () => 1,
  });

  protected readonly categorias = rxResource({
    stream: () => this.#categoriesService.listar(),
  });

  //filtrado y paginacion del lado del servidor: el resource vuelve a pedir
  //cada vez que cambian sus params (busqueda, categoria o pagina)
  protected readonly productos = rxResource({
    params: (): FiltrosProductos => ({
      page: this.pagina(),
      limit: LIMITE,
      sort: 'nombre_asc',
      nombre: this.busquedaAplicada() || undefined,
      categoriaId: this.filtrosModel().categoriaId
        ? Number(this.filtrosModel().categoriaId)
        : undefined,
    }),
    stream: ({ params }) => this.#productsService.listar(params),
  });

  protected readonly productoAgregandoId = signal<number | null>(null);

  protected buscar(event?: Event): void {
    event?.preventDefault();
    this.busquedaAplicada.set(this.filtrosModel().busqueda.trim());
  }

  protected limpiarFiltros(): void {
    this.filtrosModel.set({ busqueda: '', categoriaId: '' });
    this.busquedaAplicada.set('');
  }

  protected async agregarAlCarrito(producto: Producto): Promise<void> {
    if (!this.esCliente() || producto.stock <= 0) {
      return;
    }

    this.productoAgregandoId.set(producto.id);
    try {
      await firstValueFrom(this.#cartService.agregar(producto.id, 1));
      this.#notificaciones.exito(`${producto.nombre} se agregó al carrito.`);
    } catch (error) {
      this.#notificaciones.error(mensajeDeError(error));
    } finally {
      this.productoAgregandoId.set(null);
    }
  }
}

export default ListarProductosPage;
