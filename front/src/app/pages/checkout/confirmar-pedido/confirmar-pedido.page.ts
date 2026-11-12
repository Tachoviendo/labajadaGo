import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { CartService, Carrito } from '../../../services/cart.service';
import {
  AddressesService,
  Direccion,
  CrearDireccionBody,
} from '../../../services/addresses.service';
import { OrdersService, Pedido } from '../../../services/orders.service';

@Component({
  selector: 'app-confirmar-pedido',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './confirmar-pedido.page.html',
  styleUrl: './confirmar-pedido.page.css',
})
export class ConfirmarPedidoPage implements OnInit {
  private readonly cartService = inject(CartService);
  private readonly addressesService = inject(AddressesService);
  private readonly ordersService = inject(OrdersService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  carrito: Carrito | null = null;
  direcciones: Direccion[] = [];

  direccionSeleccionadaId: number | null = null;

  mostrarFormularioDireccion = false;

  nuevaDireccion: CrearDireccionBody = {
    calle: '',
    numero: '',
    ciudad: '',
    referencia: '',
  };

  metodoPago: 'pos' = 'pos';

  cargando = true;
  guardandoDireccion = false;
  confirmandoPedido = false;

  error = '';
  pedidoCreado: Pedido | null = null;

  //cantidad de unidades, igual que en el carrito y en mis pedidos
  get cantidadProductos(): number {
    return this.carrito?.items.reduce((total, item) => total + item.cantidad, 0) ?? 0;
  }

  ngOnInit(): void {
    this.cargarCarrito();
    this.cargarDirecciones();
  }

  cargarCarrito(): void {
    this.cartService.obtener().subscribe({
      next: (carrito) => {
        this.carrito = carrito;
        this.cargando = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.error = 'No se pudo cargar el carrito.';
        this.cargando = false;
        this.cdr.markForCheck();
      },
    });
  }

  cargarDirecciones(): void {
    this.addressesService.listar().subscribe({
      next: (direcciones) => {
        this.direcciones = direcciones;

        if (direcciones.length > 0) {
          this.direccionSeleccionadaId = direcciones[0].id;
        }

        this.cdr.markForCheck();
      },
      error: () => {
        this.error = 'No se pudieron cargar tus direcciones.';
        this.cdr.markForCheck();
      },
    });
  }

  crearDireccion(): void {
    this.error = '';

    const calle = this.nuevaDireccion.calle.trim();
    const ciudad = this.nuevaDireccion.ciudad.trim();

    if (!calle || !ciudad) {
      this.error = 'La calle y la ciudad son obligatorias.';
      return;
    }

    const datos: CrearDireccionBody = {
      calle,
      ciudad,
      numero: this.nuevaDireccion.numero?.trim() || undefined,
      referencia: this.nuevaDireccion.referencia?.trim() || undefined,
    };

    this.guardandoDireccion = true;

    this.addressesService.crear(datos).subscribe({
      next: (direccion) => {
        this.direcciones = [...this.direcciones, direccion];
        this.direccionSeleccionadaId = direccion.id;
        this.mostrarFormularioDireccion = false;
        this.guardandoDireccion = false;

        this.nuevaDireccion = {
          calle: '',
          numero: '',
          ciudad: '',
          referencia: '',
        };

        this.cdr.markForCheck();
      },
      error: (err) => {
        this.guardandoDireccion = false;
        this.error = err.error?.message || 'No se pudo guardar la dirección.';
        this.cdr.markForCheck();
      },
    });
  }

  confirmarPedido(): void {
    this.error = '';

    if (!this.carrito || this.carrito.items.length === 0) {
      this.error = 'Tu carrito está vacío.';
      return;
    }

    if (!this.direccionSeleccionadaId) {
      this.error = 'Seleccioná una dirección de entrega.';
      return;
    }

    this.confirmandoPedido = true;

    this.ordersService
      .crear({
        direccionId: this.direccionSeleccionadaId,
        metodoPago: this.metodoPago,
      })
      .subscribe({
        next: (pedido) => {
          this.pedidoCreado = pedido;
          this.confirmandoPedido = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.confirmandoPedido = false;
          this.error = err.error?.message || 'No se pudo confirmar el pedido.';
          this.cdr.markForCheck();
        },
      });
  }
}
