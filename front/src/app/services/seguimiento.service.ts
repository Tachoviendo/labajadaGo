import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { EstadoPedido } from './orders.service';

export type Coordenada = { lat: number; lng: number };
export type PuntoRecorrido = Coordenada & { fecha: string };

//lo que devuelve GET /pedidos/:id/recorrido (ver docs/seguimiento-delivery.md)
export type Recorrido = {
  pedidoId: number;
  estado: EstadoPedido;
  origen: Coordenada;
  destino: Coordenada | null;
  puntos: PuntoRecorrido[];
};

export type EventoEstado = {
  pedidoId: number;
  estado: EstadoPedido;
  repartidorId: number | null;
  fotoEntregaUrl: string | null;
};

export type EstadoConexion = 'conectando' | 'conectado' | 'reconectando' | 'cerrado';

export type OpcionesSeguimiento = {
  onUbicacion?: (punto: PuntoRecorrido) => void;
  onEstado?: (evento: EventoEstado) => void;
  //errores que manda el servidor sin cortar la conexion (ej: ubicacion invalida)
  onError?: (mensaje: string) => void;
};

//conexion abierta con el websocket de un pedido
export type ConexionSeguimiento = {
  estado: () => EstadoConexion;
  //motivo cuando se cerro por un error que no se arregla reconectando (sin permiso, etc.)
  error: () => string;
  //solo la usa el repartidor
  enviarUbicacion: (punto: Coordenada) => void;
  cerrar: () => void;
};

//url del websocket a partir de apiUrl: en la web es relativa (/api, pasa por el proxy de
//ng serve y queda ws:// o wss:// segun la pagina); en la app de Android es la direccion
//de la compu (http://10.0.2.2:3000/api -> ws://10.0.2.2:3000/api)
export function urlWebsocket(ruta: string): string {
  const url = new URL(`${environment.apiUrl}${ruta}`, location.href);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return url.toString();
}

//cierres que no tiene sentido reintentar (login invalido, sin permiso, pedido inexistente)
const CIERRES_DEFINITIVOS = new Set([4401, 4403, 4404]);
const REINTENTO_MAXIMO_MS = 15000;

@Injectable({ providedIn: 'root' })
export class SeguimientoService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  recorrido(pedidoId: number): Observable<Recorrido> {
    return this.http.get<Recorrido>(`${environment.apiUrl}/pedidos/${pedidoId}/recorrido`);
  }

  //abre el websocket del pedido, manda el login y se reconecta solo si se corta la red
  conectar(pedidoId: number, opciones: OpcionesSeguimiento = {}): ConexionSeguimiento {
    const estado = signal<EstadoConexion>('conectando');
    const error = signal('');
    let socket: WebSocket | null = null;
    let cerradoAMano = false;
    let intentos = 0;
    let timerReintento: ReturnType<typeof setTimeout> | undefined;

    const abrir = () => {
      socket = new WebSocket(urlWebsocket(`/pedidos/${pedidoId}/seguimiento`));

      socket.onopen = () => {
        socket?.send(JSON.stringify({ tipo: 'auth', token: this.authService.tokenActual }));
      };

      socket.onmessage = (evento) => {
        let mensaje: { tipo?: string; [clave: string]: unknown };
        try {
          mensaje = JSON.parse(evento.data);
        } catch {
          return;
        }
        switch (mensaje.tipo) {
          case 'listo':
            intentos = 0;
            error.set('');
            estado.set('conectado');
            break;
          case 'ubicacion':
            opciones.onUbicacion?.({
              lat: mensaje['lat'] as number,
              lng: mensaje['lng'] as number,
              fecha: mensaje['fecha'] as string,
            });
            break;
          case 'estado':
            opciones.onEstado?.(mensaje as unknown as EventoEstado);
            break;
          case 'error':
            opciones.onError?.(String(mensaje['mensaje'] ?? 'error del seguimiento'));
            break;
        }
      };

      socket.onclose = (evento) => {
        socket = null;
        if (cerradoAMano) {
          estado.set('cerrado');
          return;
        }
        if (CIERRES_DEFINITIVOS.has(evento.code)) {
          error.set(evento.reason || 'No se pudo seguir el pedido.');
          estado.set('cerrado');
          return;
        }
        //se corto la red o se reinicio la api: reintenta con espera creciente
        intentos += 1;
        estado.set('reconectando');
        const espera = Math.min(1000 * 2 ** (intentos - 1), REINTENTO_MAXIMO_MS);
        timerReintento = setTimeout(abrir, espera);
      };
    };

    abrir();

    return {
      estado: estado.asReadonly(),
      error: error.asReadonly(),
      enviarUbicacion: (punto) => {
        if (socket?.readyState === WebSocket.OPEN && estado() === 'conectado') {
          socket.send(JSON.stringify({ tipo: 'ubicacion', lat: punto.lat, lng: punto.lng }));
        }
      },
      cerrar: () => {
        cerradoAMano = true;
        clearTimeout(timerReintento);
        socket?.close();
        estado.set('cerrado');
      },
    };
  }
}
