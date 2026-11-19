import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { EstadoPedido, OrdersService, Pedido } from '../../../services/orders.service';
import {
  ConexionSeguimiento,
  EventoEstado,
  PuntoRecorrido,
  Recorrido,
  SeguimientoService,
} from '../../../services/seguimiento.service';
import { mensajeDeError } from '../../../services/api-error';
import { MapaSeguimientoComponent } from '../../../components/mapa-seguimiento/mapa-seguimiento.component';
import { UrlPublicaPipe } from '../../../pipes/url-publica.pipe';

const NOMBRES_ESTADO: Record<EstadoPedido, string> = {
  realizado: 'Realizado',
  preparando: 'En preparación',
  en_reparto: 'En reparto',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

const CLASES_ESTADO: Record<EstadoPedido, string> = {
  realizado: 'text-bg-secondary',
  preparando: 'text-bg-warning',
  en_reparto: 'text-bg-primary',
  entregado: 'text-bg-success',
  cancelado: 'text-bg-danger',
};

//detalle del pedido del cliente. mientras esta en reparto muestra el mapa en vivo
//(recorrido del GET + puntos que llegan por websocket); ya entregado, el recorrido
//completo y la foto de la entrega
@Component({
  selector: 'app-detalle-mi-pedido',
  imports: [RouterLink, CurrencyPipe, DatePipe, MapaSeguimientoComponent, UrlPublicaPipe],
  templateUrl: './detalle-mi-pedido.page.html',
  styleUrl: './detalle-mi-pedido.page.css',
})
export class DetalleMiPedidoPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly ordersService = inject(OrdersService);
  private readonly seguimientoService = inject(SeguimientoService);
  private readonly destroyRef = inject(DestroyRef);

  readonly pedido = signal<Pedido | null>(null);
  readonly recorrido = signal<Recorrido | null>(null);
  readonly puntos = signal<PuntoRecorrido[]>([]);
  readonly cargando = signal(true);
  readonly error = signal('');
  readonly conexion = signal<ConexionSeguimiento | null>(null);

  readonly nombreEstado = computed(() => {
    const pedido = this.pedido();
    return pedido ? NOMBRES_ESTADO[pedido.estado] : '';
  });
  readonly claseEstado = computed(() => {
    const pedido = this.pedido();
    return pedido ? CLASES_ESTADO[pedido.estado] : '';
  });
  readonly muestraMapa = computed(() => {
    const estado = this.pedido()?.estado;
    return (estado === 'en_reparto' || estado === 'entregado') && this.recorrido() !== null;
  });
  readonly enVivo = computed(() => this.pedido()?.estado === 'en_reparto');
  readonly ultimaUbicacion = computed(() => this.puntos().at(-1) ?? null);
  readonly textoConexion = computed(() => {
    const conexion = this.conexion();
    if (!conexion) return '';
    switch (conexion.estado()) {
      case 'conectado':
        return 'En vivo';
      case 'conectando':
        return 'Conectando...';
      case 'reconectando':
        return 'Reconectando...';
      default:
        return conexion.error() || 'Sin conexión';
    }
  });

  constructor() {
    this.destroyRef.onDestroy(() => this.conexion()?.cerrar());
  }

  async ngOnInit(): Promise<void> {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isInteger(id) || id <= 0) {
      this.error.set('El número de pedido no es válido.');
      this.cargando.set(false);
      return;
    }

    try {
      const pedido = await firstValueFrom(this.ordersService.obtener(id));
      this.pedido.set(pedido);
      if (pedido.estado === 'en_reparto' || pedido.estado === 'entregado') {
        await this.cargarRecorrido(id);
      }
      if (pedido.estado === 'en_reparto') {
        this.seguirEnVivo(id);
      }
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.cargando.set(false);
    }
  }

  private async cargarRecorrido(id: number): Promise<void> {
    const recorrido = await firstValueFrom(this.seguimientoService.recorrido(id));
    this.recorrido.set(recorrido);
    this.puntos.set(recorrido.puntos);
  }

  private seguirEnVivo(id: number): void {
    const conexion = this.seguimientoService.conectar(id, {
      onUbicacion: (punto) => this.puntos.update((puntos) => [...puntos, punto]),
      onEstado: (evento) => this.cambioDeEstado(id, evento),
    });
    this.conexion.set(conexion);
  }

  private async cambioDeEstado(id: number, evento: EventoEstado): Promise<void> {
    this.pedido.update((pedido) =>
      pedido
        ? {
            ...pedido,
            estado: evento.estado,
            repartidorId: evento.repartidorId,
            fotoEntregaUrl: evento.fotoEntregaUrl,
          }
        : pedido,
    );

    //entregado: ya no hay mas ubicaciones. se corta el websocket y se trae el recorrido final
    if (evento.estado === 'entregado') {
      this.conexion()?.cerrar();
      this.conexion.set(null);
      try {
        await this.cargarRecorrido(id);
      } catch {
        //se queda con los puntos que ya tenia
      }
    }
  }
}

export default DetalleMiPedidoPage;
