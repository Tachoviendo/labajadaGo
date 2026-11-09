import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { CartService, Carrito, ItemCarrito } from '../../../services/cart.service';

@Component({
  selector: 'app-ver-carrito',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, RouterLink],
  templateUrl: './ver-carrito.page.html',
  styleUrl: './ver-carrito.page.css',
})
export class VerCarritoPage implements OnInit {
  private readonly cartService = inject(CartService);
  private readonly cdr = inject(ChangeDetectorRef);

  carrito: Carrito | null = null;
  cargando = true;
  error = '';

  actualizandoId: number | null = null;
  eliminandoId: number | null = null;

  ngOnInit(): void {
    this.cargarCarrito();
  }

  cargarCarrito(): void {
    this.cargando = true;
    this.error = '';
    this.cdr.markForCheck();

    this.cartService.obtener().subscribe({
      next: (carrito) => {
        this.carrito = carrito;
        this.cargando = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error al cargar el carrito:', error);

        this.error = error?.error?.message ?? 'No se pudo cargar tu carrito.';

        this.cargando = false;
        this.cdr.markForCheck();
      },
    });
  }

  cambiarCantidad(item: ItemCarrito, cambio: number): void {
    if (this.actualizandoId !== null || this.eliminandoId !== null) {
      return;
    }

    const nuevaCantidad = item.cantidad + cambio;

    if (nuevaCantidad < 1 || nuevaCantidad > item.producto.stock) {
      return;
    }

    this.actualizandoId = item.producto.id;
    this.cdr.markForCheck();

    this.cartService.actualizar(item.producto.id, nuevaCantidad).subscribe({
      next: () => {
        this.actualizandoId = null;
        this.cdr.markForCheck();
        this.cargarCarrito();
      },
      error: (error) => {
        console.error('Error al actualizar cantidad:', error);

        this.error = error?.error?.message ?? 'No se pudo actualizar la cantidad.';

        this.actualizandoId = null;
        this.cdr.markForCheck();
      },
    });
  }

  eliminar(item: ItemCarrito): void {
    if (this.actualizandoId !== null || this.eliminandoId !== null) {
      return;
    }

    this.eliminandoId = item.producto.id;
    this.error = '';
    this.cdr.markForCheck();

    this.cartService.eliminar(item.producto.id).subscribe({
      next: () => {
        this.eliminandoId = null;
        this.cdr.markForCheck();
        this.cargarCarrito();
      },
      error: (error) => {
        console.error('Error al eliminar producto:', error);

        this.error = error?.error?.message ?? 'No se pudo eliminar el producto.';

        this.eliminandoId = null;
        this.cdr.markForCheck();
      },
    });
  }

  get cantidadProductos(): number {
    return this.carrito?.items.reduce((total, item) => total + item.cantidad, 0) ?? 0;
  }

  get imagenProducto(): string {
    return '/imagenes/imagendeproductos.png';
  }
}

export default VerCarritoPage;
