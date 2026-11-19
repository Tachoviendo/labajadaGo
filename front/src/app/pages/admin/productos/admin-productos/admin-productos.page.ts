import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, linkedSignal, resource, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormField, debounce, form } from '@angular/forms/signals';
import { NgbAlert, NgbPagination } from '@ng-bootstrap/ng-bootstrap';
import { firstValueFrom } from 'rxjs';

import { FiltrosProductos, Producto } from '../../../../models/product.model';
import { UrlPublicaPipe } from '../../../../pipes/url-publica.pipe';
import { mensajeDeError } from '../../../../services/api-error';
import { CategoriesService } from '../../../../services/categories.service';
import { ProductsService } from '../../../../services/products.service';

const POR_PAGINA = 10;
//debajo de esto el stock se marca en rojo
const STOCK_BAJO = 5;
const PLACEHOLDER = '/imagenes/imagendeproductos.png';

type Orden = NonNullable<FiltrosProductos['sort']>;

//listado de productos del dueño: filtros + paginacion con resource (sin effect):
//  filtros (signal form, el nombre con debounce) -> criterios (computed)
//  -> pagina (linkedSignal: vuelve a 1 cuando cambian los criterios) -> resource
@Component({
  selector: 'app-admin-productos',
  imports: [RouterLink, CurrencyPipe, FormField, NgbAlert, NgbPagination, UrlPublicaPipe],
  templateUrl: './admin-productos.page.html',
  styleUrl: './admin-productos.page.css',
})
export class AdminProductosPage {
  readonly #productsService = inject(ProductsService);
  readonly #categoriesService = inject(CategoriesService);

  protected readonly porPagina = POR_PAGINA;
  protected readonly stockBajo = STOCK_BAJO;
  protected readonly placeholder = PLACEHOLDER;

  protected readonly ordenes: { valor: Orden; nombre: string }[] = [
    { valor: 'nombre_asc', nombre: 'Nombre (A-Z)' },
    { valor: 'nombre_desc', nombre: 'Nombre (Z-A)' },
    { valor: 'precio_asc', nombre: 'Precio (menor a mayor)' },
    { valor: 'precio_desc', nombre: 'Precio (mayor a menor)' },
  ];

  protected readonly categorias = resource({
    loader: () => firstValueFrom(this.#categoriesService.listar()),
  });

  //modelo de los filtros. categoriaId como texto porque viene de un <select> ('' = todas)
  protected readonly filtros = signal({
    nombre: '',
    categoriaId: '',
    estado: 'activos' as 'activos' | 'inactivos',
    sort: 'nombre_asc' as Orden,
  });

  //debounce: el nombre llega al modelo 300 ms despues de dejar de tipear,
  //asi no se hace un pedido a la api por cada letra
  protected readonly filtrosForm = form(this.filtros, (campo) => {
    debounce(campo.nombre, 300);
  });

  //lo que se le manda a la api (sin la pagina)
  readonly #criterios = computed<FiltrosProductos>(() => {
    const f = this.filtros();
    return {
      nombre: f.nombre.trim() || undefined,
      categoriaId: f.categoriaId ? Number(f.categoriaId) : undefined,
      activo: f.estado === 'activos',
      sort: f.sort,
    };
  });

  //vuelve a la pagina 1 cada vez que cambian los criterios; ademas se puede setear a mano
  protected readonly pagina = linkedSignal(() => {
    this.#criterios();
    return 1;
  });

  protected readonly productos = resource({
    params: () => ({ ...this.#criterios(), page: this.pagina(), limit: POR_PAGINA }),
    loader: ({ params }) => firstValueFrom(this.#productsService.listar(params)),
  });

  protected readonly cambiando = signal<number | null>(null);
  protected readonly mensajeExito = signal<string | null>(null);
  protected readonly mensajeError = signal<string | null>(null);

  protected limpiarFiltros() {
    this.filtros.set({ nombre: '', categoriaId: '', estado: 'activos', sort: 'nombre_asc' });
  }

  //baja logica: activo false lo saca de la tienda pero conserva los pedidos que lo tienen.
  //sin confirmacion: se deshace desde la pestaña "Inactivos"
  protected async cambiarActivo(producto: Producto) {
    this.cambiando.set(producto.id);
    this.mensajeExito.set(null);
    this.mensajeError.set(null);
    try {
      await firstValueFrom(this.#productsService.actualizar(producto.id, { activo: !producto.activo }));
      this.mensajeExito.set(`"${producto.nombre}" fue ${producto.activo ? 'desactivado' : 'activado'}.`);
      //pasa a la otra pestaña (activos/inactivos), asi que se vuelve a pedir la pagina
      this.productos.reload();
    } catch (error) {
      this.mensajeError.set(mensajeDeError(error));
    } finally {
      this.cambiando.set(null);
    }
  }

  protected mensajeDeError(error: unknown) {
    return mensajeDeError(error);
  }
}

export default AdminProductosPage;
