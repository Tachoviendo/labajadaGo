import { CurrencyPipe } from '@angular/common';
import {
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  linkedSignal,
  numberAttribute,
  resource,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgbAlert } from '@ng-bootstrap/ng-bootstrap';
import { firstValueFrom } from 'rxjs';

import { CamaraComponent } from '../../../components/camara/camara.component';
import { EstadoPedidoComponent } from '../../../components/estado-pedido/estado-pedido.component';
import { MapaSeguimientoComponent } from '../../../components/mapa-seguimiento/mapa-seguimiento.component';
import { UrlPublicaPipe } from '../../../pipes/url-publica.pipe';
import { mensajeDeError } from '../../../services/api-error';
import { OrdersService } from '../../../services/orders.service';
import { RepartosService } from '../../../services/repartos.service';
import { ConexionSeguimiento, SeguimientoService } from '../../../services/seguimiento.service';
import { UbicacionService } from '../../../services/ubicacion.service';

//el pedido que esta llevando el repartidor: mapa con su recorrido, comparte la ubicacion
//en vivo (gps -> websocket) y lo entrega con una foto sacada con la camara (app-camara)
@Component({
  selector: 'app-mi-reparto',
  imports: [
    RouterLink,
    CurrencyPipe,
    NgbAlert,
    CamaraComponent,
    EstadoPedidoComponent,
    MapaSeguimientoComponent,
    UrlPublicaPipe,
  ],
  templateUrl: './mi-reparto.page.html',
  styleUrl: './mi-reparto.page.css',
})
export class MiRepartoPage {
  readonly #ordersService = inject(OrdersService);
  readonly #repartosService = inject(RepartosService);
  readonly #seguimientoService = inject(SeguimientoService);
  readonly #ubicacionService = inject(UbicacionService);
  readonly #router = inject(Router);

  //:id_pedido de la ruta (withComponentInputBinding). llega como texto y se pasa a numero
  readonly idPedido = input.required({ alias: 'id_pedido', transform: numberAttribute });

  //websocket del pedido y corte del gps (se abren solo si el pedido esta en reparto)
  protected readonly conexion = signal<ConexionSeguimiento | null>(null);
  #dejarDeSeguir: (() => void) | null = null;
  protected readonly errorUbicacion = signal<string | null>(null);

  protected readonly pedido = resource({
    params: () => ({ id: this.idPedido() }),
    loader: async ({ params }) => {
      const pedido = await firstValueFrom(this.#ordersService.obtener(params.id));
      //si dejo de estar en reparto (lo entregaron o el cajero lo devolvio) se corta el gps
      if (pedido.estado === 'en_reparto') this.empezarSeguimiento(pedido.id);
      else this.cortarSeguimiento();
      return pedido;
    },
  });

  //recorrido guardado (origen, destino y los puntos que ya se mandaron)
  protected readonly recorrido = resource({
    params: () => ({ id: this.idPedido() }),
    loader: ({ params }) => firstValueFrom(this.#seguimientoService.recorrido(params.id)),
  });

  //arranca con los puntos guardados y se le suman los que llegan por el websocket.
  //si el recorrido se vuelve a cargar, linkedSignal se resetea solo a esos puntos
  protected readonly puntos = linkedSignal(() =>
    this.recorrido.hasValue() ? this.recorrido.value().puntos : [],
  );

  protected readonly textoConexion = computed(() => {
    switch (this.conexion()?.estado()) {
      case 'conectado':
        return 'Compartiendo ubicación';
      case 'conectando':
        return 'Conectando…';
      case 'reconectando':
        return 'Reconectando…';
      default:
        return this.conexion()?.error() || 'Sin conexión';
    }
  });

  //link para abrir la navegacion en el celular (google maps)
  protected readonly linkNavegacion = computed(() => {
    const destino = this.recorrido.hasValue() ? this.recorrido.value().destino : null;
    return destino
      ? `https://www.google.com/maps/dir/?api=1&destination=${destino.lat},${destino.lng}`
      : null;
  });

  //foto de la entrega (jpeg ya achicado por app-camara)
  protected readonly foto = signal<Blob | null>(null);
  protected readonly vistaPrevia = computed(() => {
    const foto = this.foto();
    return foto ? URL.createObjectURL(foto) : null;
  });
  protected readonly entregando = signal(false);
  protected readonly errorEntrega = signal<string | null>(null);

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.cortarSeguimiento();
      const vista = this.vistaPrevia();
      if (vista) URL.revokeObjectURL(vista);
    });
  }

  //la foto que saco app-camara; null = descartarla para sacar otra
  protected cambiarFoto(foto: Blob | null) {
    const anterior = this.vistaPrevia();
    if (anterior) URL.revokeObjectURL(anterior);
    this.foto.set(foto);
    this.errorEntrega.set(null);
  }

  protected async entregar() {
    const foto = this.foto();
    if (!foto || this.entregando()) return;
    this.entregando.set(true);
    this.errorEntrega.set(null);
    try {
      await firstValueFrom(this.#repartosService.entregar(this.idPedido(), foto, 'entrega.jpg'));
      this.cortarSeguimiento();
      await this.#router.navigate(['/repartos/tablero']);
    } catch (error) {
      this.errorEntrega.set(mensajeDeError(error));
    } finally {
      this.entregando.set(false);
    }
  }

  protected reintentarUbicacion() {
    this.cortarGps();
    this.iniciarGps();
  }

  protected mensajeDeError(error: unknown) {
    return mensajeDeError(error);
  }

  //abre el websocket (recibe los puntos, incluso los propios, y cambios de estado) y el gps
  private empezarSeguimiento(id: number) {
    if (this.conexion()) return;
    this.conexion.set(
      this.#seguimientoService.conectar(id, {
        onUbicacion: (punto) => this.puntos.update((puntos) => [...puntos, punto]),
        onEstado: () => this.pedido.reload(),
      }),
    );
    this.iniciarGps();
  }

  //cada posicion nueva del dispositivo se manda por el websocket. el servidor la guarda y
  //la reenvia a todos los conectados (el cliente y este mismo mapa, via onUbicacion)
  private async iniciarGps() {
    this.errorUbicacion.set(null);
    try {
      this.#dejarDeSeguir = await this.#ubicacionService.seguirPosicion(
        (punto) => {
          this.errorUbicacion.set(null);
          this.conexion()?.enviarUbicacion(punto);
        },
        (error) => this.errorUbicacion.set(error.message),
      );
    } catch (error) {
      this.errorUbicacion.set(error instanceof Error ? error.message : 'No se pudo obtener la ubicación.');
    }
  }

  private cortarGps() {
    this.#dejarDeSeguir?.();
    this.#dejarDeSeguir = null;
  }

  private cortarSeguimiento() {
    this.cortarGps();
    this.conexion()?.cerrar();
    this.conexion.set(null);
  }
}

export default MiRepartoPage;
