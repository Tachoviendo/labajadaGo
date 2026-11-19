import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { CartService, Carrito } from '../../../services/cart.service';
import {
  AddressesService,
  Direccion,
  CrearDireccionBody,
  tieneUbicacion,
} from '../../../services/addresses.service';
import {
  MapaSelectorComponent,
  PuntoMapa,
} from '../../../components/mapa-selector/mapa-selector.component';
import { OrdersService, Pedido } from '../../../services/orders.service';

@Component({
  selector: 'app-confirmar-pedido',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MapaSelectorComponent],
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

  readonly tieneUbicacion = tieneUbicacion;

  //lat/lng arrancan en null hasta que el cliente marca el punto en el mapa
  nuevaDireccion: Omit<CrearDireccionBody, 'lat' | 'lng'> & { lat: number | null; lng: number | null } = {
    calle: '',
    numero: '',
    ciudad: 'Salto',
    referencia: '',
    lat: null,
    lng: null,
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

        //se preselecciona la primera que tenga el punto en el mapa
        const conUbicacion = direcciones.find(tieneUbicacion);
        if (conUbicacion) {
          this.direccionSeleccionadaId = conUbicacion.id;
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

    const { lat, lng } = this.nuevaDireccion;
    if (lat === null || lng === null) {
      this.error = 'Marcá en el mapa dónde querés recibir el pedido.';
      return;
    }

    const datos: CrearDireccionBody = {
      calle,
      ciudad,
      numero: this.nuevaDireccion.numero?.trim() || undefined,
      referencia: this.nuevaDireccion.referencia?.trim() || undefined,
      lat,
      lng,
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
          ciudad: 'Salto',
          referencia: '',
          lat: null,
          lng: null,
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

  marcarPunto(punto: PuntoMapa): void {
    this.nuevaDireccion = { ...this.nuevaDireccion, lat: punto.lat, lng: punto.lng };
    this.cdr.markForCheck();
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

    const seleccionada = this.direcciones.find((d) => d.id === this.direccionSeleccionadaId);
    if (seleccionada && !tieneUbicacion(seleccionada)) {
      this.error = 'Esa dirección no tiene la ubicación marcada en el mapa. Editala en Mis direcciones.';
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
