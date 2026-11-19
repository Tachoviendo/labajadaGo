import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, DestroyRef, computed, inject, resource, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgbAlert } from '@ng-bootstrap/ng-bootstrap';
import { firstValueFrom } from 'rxjs';

import { mensajeDeError } from '../../../../services/api-error';
import { AuthService } from '../../../../services/auth.service';
import { EstadoPedido, OrdersService, Pedido } from '../../../../services/orders.service';

//cada cuanto se vuelve a pedir el tablero (polling)
const INTERVALO_MS = 15_000;
//cuantos entregados de hoy se muestran como maximo
const MAX_ENTREGADOS = 30;

type EstadoTablero = Exclude<EstadoPedido, 'cancelado'>;

type Columna = {
  estado: EstadoTablero;
  titulo: string;
  ayuda: string;
};

type Movimiento = { destino: EstadoTablero; texto: string };

//movimientos que la api le permite al cajero (ver changeStatus en orders.service.js).
//salir a reparto y entregar lo hace el repartidor
const MOVIMIENTOS_CAJERO: Partial<Record<EstadoTablero, Movimiento[]>> = {
  realizado: [{ destino: 'preparando', texto: 'Empezar a preparar' }],
  preparando: [{ destino: 'realizado', texto: 'Volver a entrantes' }],
  en_reparto: [{ destino: 'preparando', texto: 'Volver a preparando' }],
};

//el dueño puede todo lo del cajero y ademas sacar a reparto y marcar entregado a mano
const MOVIMIENTOS_DUENO: Partial<Record<EstadoTablero, Movimiento[]>> = {
  realizado: MOVIMIENTOS_CAJERO.realizado,
  preparando: [
    ...MOVIMIENTOS_CAJERO.preparando!,
    { destino: 'en_reparto', texto: 'Sacar a reparto' },
  ],
  en_reparto: [
    ...MOVIMIENTOS_CAJERO.en_reparto!,
    { destino: 'entregado', texto: 'Marcar entregado' },
  ],
};

//YYYY-MM-DD en la hora local (la api filtra por dia con fecha_creacion::date)
function hoy(): string {
  const ahora = new Date();
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const dia = String(ahora.getDate()).padStart(2, '0');
  return `${ahora.getFullYear()}-${mes}-${dia}`;
}

@Component({
  selector: 'app-pedidos-entrantes',
  imports: [RouterLink, DatePipe, CurrencyPipe, NgbAlert],
  templateUrl: './pedidos-entrantes.page.html',
  styleUrl: './pedidos-entrantes.page.css',
})
export class PedidosEntrantesPage {
  readonly #ordersService = inject(OrdersService);

  //los movimientos posibles dependen del rol (no cambia mientras se esta en la pantalla)
  readonly #movimientosPorEstado = inject(AuthService).tieneRol('dueno')
    ? MOVIMIENTOS_DUENO
    : MOVIMIENTOS_CAJERO;

  protected readonly columnas: Columna[] = [
    { estado: 'realizado', titulo: 'Entrantes', ayuda: 'Pedidos nuevos para preparar' },
    { estado: 'preparando', titulo: 'Preparando', ayuda: 'Listos para que los recoja un repartidor' },
    { estado: 'en_reparto', titulo: 'En reparto', ayuda: 'Los está llevando un repartidor' },
    { estado: 'entregado', titulo: 'Entregados hoy', ayuda: 'Los marca el repartidor (o el dueño)' },
  ];

  //ids de los pedidos nuevos que llegaron desde que se abrio la pantalla (se resaltan)
  protected readonly nuevos = signal<ReadonlySet<number>>(new Set());
  protected readonly cantidadNuevos = computed(() => this.nuevos().size);

  protected readonly ultimaActualizacion = signal<Date | null>(null);
  protected readonly mensajeError = signal<string | null>(null);

  //pedido que se esta moviendo (deshabilita sus botones mientras responde la api)
  protected readonly moviendo = signal<number | null>(null);
  //pedido que se esta arrastrando, para marcar a que columnas se puede soltar
  protected readonly arrastrado = signal<Pedido | null>(null);
  protected readonly columnaSobre = signal<EstadoTablero | null>(null);

  //pedidos "realizado" que ya se vieron. null = todavia no hubo una primera carga
  #realizadosVistos: Set<number> | null = null;

  //dos pedidos en paralelo: los que estan en curso (sin importar la fecha) y los entregados de hoy
  protected readonly pedidos = resource({
    loader: async () => {
      const [enCurso, entregados] = await Promise.all([
        firstValueFrom(this.#ordersService.listar({ activos: true, sort: 'fecha_asc', limit: 100 })),
        firstValueFrom(
          this.#ordersService.listar({
            estado: 'entregado',
            fechaDesde: hoy(),
            sort: 'fecha_desc',
            limit: MAX_ENTREGADOS,
          }),
        ),
      ]);
      this.detectarNuevos(enCurso);
      this.ultimaActualizacion.set(new Date());
      return [...enCurso, ...entregados];
    },
  });

  //los pedidos agrupados por columna
  protected readonly tablero = computed(() => {
    const grupos: Record<EstadoTablero, Pedido[]> = {
      realizado: [],
      preparando: [],
      en_reparto: [],
      entregado: [],
    };
    if (!this.pedidos.hasValue()) return grupos;
    for (const pedido of this.pedidos.value()) {
      if (pedido.estado !== 'cancelado') grupos[pedido.estado].push(pedido);
    }
    return grupos;
  });

  constructor() {
    //polling: no se pide si la pestaña esta oculta, para no gastar de mas
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') this.pedidos.reload();
    }, INTERVALO_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  protected actualizarAhora() {
    this.pedidos.reload();
  }

  protected movimientos(pedido: Pedido) {
    return pedido.estado === 'cancelado' ? [] : (this.#movimientosPorEstado[pedido.estado] ?? []);
  }

  protected puedeIrA(pedido: Pedido | null, destino: EstadoTablero) {
    return !!pedido && this.movimientos(pedido).some((m) => m.destino === destino);
  }

  protected async mover(pedido: Pedido, destino: EstadoTablero) {
    if (!this.puedeIrA(pedido, destino) || this.moviendo() !== null) return;
    if (destino === 'entregado' && !confirm(`¿Marcar el pedido #${pedido.id} como entregado? No se puede deshacer.`)) {
      return;
    }
    this.moviendo.set(pedido.id);
    this.mensajeError.set(null);
    try {
      await firstValueFrom(this.#ordersService.cambiarEstado(pedido.id, destino));
      this.pedidos.reload();
    } catch (error) {
      //409 de la api (ej: otro lo movio antes): se muestra el mensaje y se refresca
      this.mensajeError.set(`Pedido #${pedido.id}: ${mensajeDeError(error)}`);
      this.pedidos.reload();
    } finally {
      this.moviendo.set(null);
    }
  }

  //drag & drop nativo de html (sin librerias)
  protected empezarArrastre(event: DragEvent, pedido: Pedido) {
    this.arrastrado.set(pedido);
    event.dataTransfer?.setData('text/plain', String(pedido.id));
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }

  protected terminarArrastre() {
    this.arrastrado.set(null);
    this.columnaSobre.set(null);
  }

  //preventDefault es lo que habilita soltar en la columna; solo se hace si el movimiento vale
  protected sobreColumna(event: DragEvent, destino: EstadoTablero) {
    if (!this.puedeIrA(this.arrastrado(), destino)) return;
    event.preventDefault();
    this.columnaSobre.set(destino);
  }

  protected soltar(event: DragEvent, destino: EstadoTablero) {
    event.preventDefault();
    const pedido = this.arrastrado();
    this.terminarArrastre();
    if (pedido) this.mover(pedido, destino);
  }

  protected esNuevo(pedido: Pedido) {
    return this.nuevos().has(pedido.id);
  }

  //"ya los vi": saca el aviso y el resaltado
  protected marcarVistos() {
    this.nuevos.set(new Set());
  }

  protected cantidadProductos(pedido: Pedido) {
    return pedido.items.reduce((total, item) => total + item.cantidad, 0);
  }

  protected mensajeDeError(error: unknown) {
    return mensajeDeError(error);
  }

  //compara los pedidos "realizado" que llegan con los que ya se habian visto.
  //en la primera carga solo los guarda: los que ya estaban no cuentan como nuevos
  private detectarNuevos(lista: Pedido[]) {
    const realizados = lista.filter((p) => p.estado === 'realizado').map((p) => p.id);

    if (this.#realizadosVistos === null) {
      this.#realizadosVistos = new Set(realizados);
      return;
    }

    const llegaron = realizados.filter((id) => !this.#realizadosVistos!.has(id));
    if (llegaron.length === 0) return;

    llegaron.forEach((id) => this.#realizadosVistos!.add(id));
    this.nuevos.update((actuales) => new Set([...actuales, ...llegaron]));
  }
}

export default PedidosEntrantesPage;
