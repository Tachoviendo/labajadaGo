import { DestroyRef, Injectable, computed, signal } from '@angular/core';

import { EstadoConexion, urlWebsocket } from './seguimiento.service';

type MensajeStock =
  | { tipo: 'listo' }
  | { tipo: 'stock'; productos: { id: number; stock: number }[] };

const REINTENTO_MAXIMO_MS = 15000;

//stock en vivo de los productos (websocket publico /api/productos/stock, ver
//api/src/routes/stock.routes.js). la api avisa cada vez que un pedido se confirma o se
//cancela, o el dueño edita el stock. hay una sola conexion para toda la app: se abre
//cuando alguna pagina la usa (seguir) y se cierra cuando ya no queda ninguna
@Injectable({ providedIn: 'root' })
export class StockService {
  //ultimo stock conocido por producto (solo los que cambiaron desde que se abrio la pagina)
  readonly #stock = signal<ReadonlyMap<number, number>>(new Map());
  readonly #estado = signal<EstadoConexion>('cerrado');
  //sube cada vez que se reconecta despues de un corte: mientras estuvo cortado se pudieron
  //perder avisos, asi que las paginas vuelven a pedir sus datos
  readonly #reconexiones = signal(0);

  readonly estado = this.#estado.asReadonly();
  readonly reconexiones = this.#reconexiones.asReadonly();
  readonly enVivo = computed(() => this.#estado() === 'conectado');

  #usuarios = 0;
  #socket: WebSocket | null = null;
  #intentos = 0;
  #huboCorte = false;
  #timerReintento: ReturnType<typeof setTimeout> | undefined;

  //stock actual de un producto: el que llego por el websocket o, si todavia no cambio,
  //el que vino de la api. al leerlo en un template se actualiza solo
  de(producto: { id: number; stock: number }): number {
    return this.#stock().get(producto.id) ?? producto.stock;
  }

  //la pagina que muestra stock lo llama en su constructor. la conexion queda abierta
  //mientras haya al menos una pagina usandola
  seguir(destroyRef: DestroyRef): void {
    this.#usuarios += 1;
    if (this.#usuarios === 1) this.#abrir();
    destroyRef.onDestroy(() => {
      this.#usuarios -= 1;
      if (this.#usuarios === 0) this.#cerrar();
    });
  }

  #abrir(): void {
    if (typeof WebSocket === 'undefined') return;
    this.#estado.set(this.#intentos === 0 ? 'conectando' : 'reconectando');
    const socket = new WebSocket(urlWebsocket('/productos/stock'));
    this.#socket = socket;

    socket.onmessage = (evento) => {
      let mensaje: MensajeStock;
      try {
        mensaje = JSON.parse(evento.data);
      } catch {
        return;
      }
      if (mensaje.tipo === 'listo') {
        this.#intentos = 0;
        this.#estado.set('conectado');
        if (this.#huboCorte) {
          this.#huboCorte = false;
          this.#reconexiones.update((n) => n + 1);
        }
      } else if (mensaje.tipo === 'stock') {
        this.#stock.update((actual) => {
          const nuevo = new Map(actual);
          for (const { id, stock } of mensaje.productos) nuevo.set(id, stock);
          return nuevo;
        });
      }
    };

    socket.onclose = () => {
      if (this.#socket !== socket) return;
      this.#socket = null;
      if (this.#usuarios === 0) {
        this.#estado.set('cerrado');
        return;
      }
      //se corto la red o se reinicio la api: reintenta con espera creciente
      this.#huboCorte = true;
      this.#intentos += 1;
      this.#estado.set('reconectando');
      const espera = Math.min(1000 * 2 ** (this.#intentos - 1), REINTENTO_MAXIMO_MS);
      this.#timerReintento = setTimeout(() => this.#abrir(), espera);
    };
  }

  #cerrar(): void {
    clearTimeout(this.#timerReintento);
    const socket = this.#socket;
    this.#socket = null;
    socket?.close();
    this.#intentos = 0;
    this.#huboCorte = false;
    this.#estado.set('cerrado');
    //sin nadie mirando no se reciben avisos: lo guardado puede quedar viejo
    this.#stock.set(new Map());
  }
}
