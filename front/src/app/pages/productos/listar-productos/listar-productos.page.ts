import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import {
  Categoria,
  FiltrosProductos,
  Producto,
  ProductosPaginados,
} from '../../../models/product.model';

import { ProductsService } from '../../../services/products.service';
import { CategoriesService } from '../../../services/categories.service';
import { CartService } from '../../../services/cart.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-listar-productos',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, CurrencyPipe],
  templateUrl: './listar-productos.page.html',
  styleUrl: './listar-productos.page.css',
})
export class ListarProductosPage implements OnInit {
  private readonly productsService = inject(ProductsService);
  private readonly categoriesService = inject(CategoriesService);
  private readonly cartService = inject(CartService);
  private readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);

  productos: Producto[] = [];
  categorias: Categoria[] = [];

  busqueda = '';
  categoriaSeleccionada = '';

  paginaActual = 1;
  limite = 8;
  totalProductos = 0;
  totalPaginas = 0;

  cargando = false;
  error = '';
  mensajeCarrito = '';
  productoAgregandoId: number | null = null;

  get esCliente(): boolean {
    return this.authService.tieneRol('cliente');
  }

  ngOnInit(): void {
    this.cargarCategorias();
    this.cargarProductos();
  }

  cargarCategorias(): void {
    this.categoriesService.listar().subscribe({
      next: (categorias) => {
        this.categorias = categorias;

        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'No se pudieron cargar las categorías.';

        this.cdr.detectChanges();
      },
    });
  }

  cargarProductos(): void {
    this.cargando = true;
    this.error = '';
    this.cdr.detectChanges();

    const filtros: FiltrosProductos = {
      page: this.paginaActual,
      limit: this.limite,
      sort: 'nombre_asc',
    };

    if (this.busqueda.trim()) {
      filtros.nombre = this.busqueda.trim();
    }

    if (this.categoriaSeleccionada) {
      filtros.categoriaId = Number(this.categoriaSeleccionada);
    }

    console.log('Solicitando productos...', filtros);

    this.productsService.listar(filtros).subscribe({
      next: (respuesta) => {
        console.log('Respuesta recibida:', respuesta);

        this.productos = respuesta.data;
        this.paginaActual = respuesta.pagination.page;
        this.totalProductos = respuesta.pagination.total;
        this.totalPaginas = respuesta.pagination.totalPages;
        this.cargando = false;

        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error al cargar productos:', error);

        this.error = 'No se pudieron cargar los productos. Intentá nuevamente.';
        this.cargando = false;

        this.cdr.detectChanges();
      },
    });
  }

  buscar(): void {
    this.paginaActual = 1;
    this.cargarProductos();
  }

  cambiarCategoria(): void {
    this.paginaActual = 1;
    this.cargarProductos();
  }

  cambiarPagina(pagina: number): void {
    if (pagina < 1 || pagina > this.totalPaginas || pagina === this.paginaActual) {
      return;
    }

    this.paginaActual = pagina;
    this.cargarProductos();
  }

  agregarAlCarrito(producto: Producto): void {
    if (!this.esCliente || producto.stock <= 0) {
      return;
    }

    this.productoAgregandoId = producto.id;
    this.mensajeCarrito = '';

    this.cartService.agregar(producto.id, 1).subscribe({
      next: () => {
        this.mensajeCarrito = `${producto.nombre} se agregó al carrito.`;
        this.productoAgregandoId = null;

        this.cdr.detectChanges();
      },
      error: (error) => {
        this.mensajeCarrito = error?.error?.message ?? 'No se pudo agregar el producto al carrito.';
        this.productoAgregandoId = null;

        this.cdr.detectChanges();
      },
    });
  }

  obtenerPaginas(): number[] {
    return Array.from({ length: this.totalPaginas }, (_, indice) => indice + 1);
  }
}

export default ListarProductosPage;
