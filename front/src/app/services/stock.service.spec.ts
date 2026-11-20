import { DestroyRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { StockService } from './stock.service';

//websocket falso: guarda las instancias para poder mandarles mensajes desde el test
class WebSocketFalso {
  static instancias: WebSocketFalso[] = [];
  onmessage: ((evento: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  cerrado = false;

  constructor(readonly url: string) {
    WebSocketFalso.instancias.push(this);
  }

  recibir(mensaje: unknown) {
    this.onmessage?.({ data: JSON.stringify(mensaje) });
  }

  close() {
    this.cerrado = true;
    this.onclose?.();
  }
}

//DestroyRef de mentira para simular que una pagina se destruye
function crearDestroyRef() {
  const callbacks: (() => void)[] = [];
  const ref = { onDestroy: (cb: () => void) => callbacks.push(cb) } as unknown as DestroyRef;
  return { ref, destruir: () => callbacks.forEach((cb) => cb()) };
}

describe('StockService', () => {
  let service: StockService;
  const original = globalThis.WebSocket;

  beforeEach(() => {
    WebSocketFalso.instancias = [];
    globalThis.WebSocket = WebSocketFalso as unknown as typeof WebSocket;
    TestBed.configureTestingModule({});
    service = TestBed.inject(StockService);
  });

  afterEach(() => {
    globalThis.WebSocket = original;
    vi.useRealTimers();
  });

  it('usa el stock de la api hasta que llega un aviso por el websocket', () => {
    const pagina = crearDestroyRef();
    service.seguir(pagina.ref);
    const socket = WebSocketFalso.instancias[0];
    expect(socket.url).toContain('/productos/stock');

    expect(service.de({ id: 1, stock: 10 })).toBe(10);

    socket.recibir({ tipo: 'listo' });
    expect(service.enVivo()).toBe(true);

    socket.recibir({ tipo: 'stock', productos: [{ id: 1, stock: 7 }] });
    expect(service.de({ id: 1, stock: 10 })).toBe(7);
    //los otros productos siguen con el valor de la api
    expect(service.de({ id: 2, stock: 3 })).toBe(3);
  });

  it('abre una sola conexion para varias paginas y la cierra con la ultima', () => {
    const catalogo = crearDestroyRef();
    const detalle = crearDestroyRef();
    service.seguir(catalogo.ref);
    service.seguir(detalle.ref);
    expect(WebSocketFalso.instancias.length).toBe(1);

    catalogo.destruir();
    expect(WebSocketFalso.instancias[0].cerrado).toBe(false);

    detalle.destruir();
    expect(WebSocketFalso.instancias[0].cerrado).toBe(true);
    expect(service.estado()).toBe('cerrado');
  });

  it('si se corta reintenta y avisa la reconexion para volver a pedir los datos', () => {
    vi.useFakeTimers();
    service.seguir(crearDestroyRef().ref);
    const primero = WebSocketFalso.instancias[0];
    primero.recibir({ tipo: 'listo' });

    //corte de red: el servidor cierra sin que la pagina lo pida
    primero.onclose?.();
    expect(service.estado()).toBe('reconectando');

    vi.advanceTimersByTime(1000);
    const segundo = WebSocketFalso.instancias[1];
    expect(segundo).toBeDefined();
    expect(service.reconexiones()).toBe(0);

    segundo.recibir({ tipo: 'listo' });
    expect(service.reconexiones()).toBe(1);
    expect(service.enVivo()).toBe(true);
  });
});
