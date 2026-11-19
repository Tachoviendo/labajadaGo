import {
  Component,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  numberAttribute,
  signal,
  untracked,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { EstadoPedido, OrdersService, Pedido } from '../../../services/orders.service';
import {
  ConexionSeguimiento,
  EventoEstado,
  PuntoRecorrido,
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
export class DetalleMiPedidoPage {
  readonly #ordersService = inject(OrdersService);
  readonly #seguimientoService = inject(SeguimientoService);

  //:id de la ruta (withComponentInputBinding)
  readonly id = input.required({ transform: numberAttribute });

  protected readonly idValido = computed(() => Number.isInteger(this.id()) && this.id() > 0);
  protected readonly mensajeDeError = mensajeDeError;

  protected readonly pedidoResource = rxResource({
    params: () => (this.idValido() ? this.id() : undefined),
    stream: ({ params: id }) => this.#ordersService.obtener(id),
  });

  //copia editable del pedido: el websocket le cambia el estado y la foto sin volver a pedirlo
  protected readonly pedido = linkedSignal<Pedido | null>(
    //value() tira error si el resource fallo, por eso se chequea hasValue antes
    () => (this.pedidoResource.hasValue() ? this.pedidoResource.value() : null),
  );

  protected readonly estado = computed(() => this.pedido()?.estado);
  protected readonly enVivo = computed(() => this.estado() === 'en_reparto');

  //el recorrido solo existe en reparto o entregado. como el estado es parte de los params,
  //cuando llega "entregado" por websocket se vuelve a pedir y queda el recorrido final
  protected readonly recorrido = rxResource({
    params: () => {
      const estado = this.estado();
      return estado === 'en_reparto' || estado === 'entregado'
        ? { id: this.id(), estado }
        : undefined;
    },
    stream: ({ params }) => this.#seguimientoService.recorrido(params.id),
  });

  //puntos del recorrido + los que van llegando por websocket
  protected readonly puntos = linkedSignal<PuntoRecorrido[]>(
    () => (this.recorrido.hasValue() ? this.recorrido.value().puntos : []),
  );

  protected readonly conexion = signal<ConexionSeguimiento | null>(null);

  protected readonly nombreEstado = computed(() => {
    const estado = this.estado();
    return estado ? NOMBRES_ESTADO[estado] : '';
  });
  protected readonly claseEstado = computed(() => {
    const estado = this.estado();
    return estado ? CLASES_ESTADO[estado] : '';
  });
  protected readonly muestraMapa = computed(
    () => (this.estado() === 'en_reparto' || this.estado() === 'entregado') && this.recorrido.hasValue(),
  );
  protected readonly ultimaUbicacion = computed(() => this.puntos().at(-1) ?? null);
  protected readonly textoConexion = computed(() => {
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
    //websocket abierto solo mientras el pedido esta en reparto (y ya se cargo el recorrido,
    //para no perder puntos). cuando cambia el estado o se sale de la pagina, se cierra
    effect((onCleanup) => {
      if (!this.enVivo() || !this.recorrido.hasValue()) return;

      const id = this.id();
      const conexion = untracked(() =>
        this.#seguimientoService.conectar(id, {
          onUbicacion: (punto) => this.puntos.update((puntos) => [...puntos, punto]),
          onEstado: (evento) => this.cambioDeEstado(evento),
        }),
      );
      this.conexion.set(conexion);

      onCleanup(() => {
        conexion.cerrar();
        this.conexion.set(null);
      });
    });
  }

  private cambioDeEstado(evento: EventoEstado): void {
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
  }
}

export default DetalleMiPedidoPage;
