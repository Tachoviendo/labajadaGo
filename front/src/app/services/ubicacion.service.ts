import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Geolocation, Position } from '@capacitor/geolocation';

import { Coordenada } from './seguimiento.service';

const OPCIONES = { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 };

export class UbicacionError extends Error {}

//ubicacion del dispositivo. en la app de Android usa el plugin nativo de Capacitor (pide el
//permiso de Android y no necesita https); en el navegador usa navigator.geolocation, que
//solo anda en https o en localhost
@Injectable({ providedIn: 'root' })
export class UbicacionService {
  //una sola lectura (ej: "Usar mi ubicacion" al marcar una direccion)
  async obtenerPosicion(): Promise<Coordenada> {
    await this.asegurarPermiso();
    try {
      return aCoordenada(await Geolocation.getCurrentPosition(OPCIONES));
    } catch (error) {
      throw traducir(error);
    }
  }

  //seguimiento continuo (el repartidor mientras esta en reparto). llama a onPosicion cada vez
  //que el dispositivo informa una posicion nueva y devuelve la funcion para cortarlo
  async seguirPosicion(
    onPosicion: (punto: Coordenada) => void,
    onError?: (error: UbicacionError) => void,
  ): Promise<() => void> {
    await this.asegurarPermiso();
    const id = await Geolocation.watchPosition(OPCIONES, (posicion, error) => {
      if (error || !posicion) {
        onError?.(traducir(error));
        return;
      }
      onPosicion(aCoordenada(posicion));
    });
    return () => void Geolocation.clearWatch({ id });
  }

  //en la app el permiso se pide con el dialogo de Android. en el navegador lo pide el propio
  //navegador al leer la posicion (el plugin no implementa los permisos en web)
  private async asegurarPermiso(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      if (!('geolocation' in navigator)) {
        throw new UbicacionError('Este navegador no permite obtener la ubicación.');
      }
      return;
    }
    let permisos = await Geolocation.checkPermissions();
    if (permisos.location !== 'granted') {
      permisos = await Geolocation.requestPermissions({ permissions: ['location'] });
    }
    if (permisos.location !== 'granted') {
      throw new UbicacionError('Sin permiso de ubicación. Activalo en los ajustes de la app.');
    }
  }
}

function aCoordenada(posicion: Position): Coordenada {
  return { lat: posicion.coords.latitude, lng: posicion.coords.longitude };
}

function traducir(error: unknown): UbicacionError {
  if (error instanceof UbicacionError) return error;
  const mensaje = String((error as { message?: string })?.message ?? '').toLowerCase();
  if (mensaje.includes('denied') || mensaje.includes('permission')) {
    return new UbicacionError('Sin permiso de ubicación. Activalo en los ajustes.');
  }
  if (mensaje.includes('location services') || mensaje.includes('disabled')) {
    return new UbicacionError('La ubicación del dispositivo está apagada.');
  }
  if (mensaje.includes('timeout')) {
    return new UbicacionError('No se pudo obtener la ubicación a tiempo. Probá de nuevo.');
  }
  return new UbicacionError('No se pudo obtener la ubicación.');
}
