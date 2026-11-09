import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { Producto } from '../../../models/product.model';
import { ProductsService } from '../../../services/products.service';
import { CartService } from '../../../services/cart.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-detalle-producto',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, RouterLink],
  templateUrl: './detalle-producto.page.html',
  styleUrl: './detalle-producto.page.css',
})
export class DetalleProductoPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly productsService = inject(ProductsService);
  private readonly cartService = inject(CartService);
  private readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);

  producto: Producto | null = null;
  cargando = true;
  agregando = false;
  error = '';
  mensaje = '';

  get esCliente(): boolean {
    return this.authService.tieneRol('cliente');
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = Number(params.get('id'));

      if (!Number.isInteger(id) || id <= 0) {
        this.error = 'El identificador del producto no es válido.';
        this.cargando = false;
        this.cdr.markForCheck();
        return;
      }

      this.cargarProducto(id);
    });
  }

  cargarProducto(id: number): void {
    this.cargando = true;
    this.error = '';
    this.producto = null;
    this.cdr.markForCheck();

    this.productsService.obtener(id).subscribe({
      next: (producto) => {
        this.producto = producto;
        this.cargando = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error al cargar producto:', error);

        this.error = 'No se pudo encontrar el producto.';
        this.cargando = false;
        this.cdr.markForCheck();
      },
    });
  }

  agregarAlCarrito(): void {
    if (!this.producto || !this.esCliente || this.producto.stock <= 0 || this.agregando) {
      return;
    }

    this.agregando = true;
    this.mensaje = '';
    this.cdr.markForCheck();

    this.cartService.agregar(this.producto.id, 1).subscribe({
      next: () => {
        this.mensaje = 'El producto se agregó correctamente al carrito.';
        this.agregando = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error al agregar producto al carrito:', error);

        this.mensaje = error?.error?.message ?? 'No se pudo agregar el producto al carrito.';

        this.agregando = false;
        this.cdr.markForCheck();
      },
    });
  }

  get imagenProducto(): string {
    return this.producto?.imagenUrl || '/imagenes/imagendeproductos.png';
  }
}

export default DetalleProductoPage;
