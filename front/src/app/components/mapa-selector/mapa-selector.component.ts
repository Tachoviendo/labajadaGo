import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import OlMap from 'ol/Map';
import View from 'ol/View';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import OSM from 'ol/source/OSM';
import { Circle, Fill, Stroke, Style } from 'ol/style';
import { fromLonLat, toLonLat } from 'ol/proj';

import { environment } from '../../../environments/environment';
import { UbicacionError, UbicacionService } from '../../services/ubicacion.service';

export type PuntoMapa = { lat: number; lng: number };

const ZOOM_CON_PUNTO = 17;

//mapa de OpenLayers para que el cliente marque donde quiere recibir el pedido.
//click (o tap) sobre el mapa mueve el pin y emite el punto elegido
@Component({
  selector: 'app-mapa-selector',
  template: `
    <div class="mapa-selector">
      <div #contenedor class="mapa-selector__mapa" role="application" aria-label="Mapa para marcar la ubicación"></div>
      <div class="d-flex flex-wrap align-items-center gap-2 mt-2">
        <button
          type="button"
          class="btn btn-outline-secondary btn-sm"
          [disabled]="buscandoUbicacion()"
          (click)="usarMiUbicacion()"
        >
          {{ buscandoUbicacion() ? 'Buscando...' : 'Usar mi ubicación' }}
        </button>
        <small class="text-body-secondary">
          @if (lat() !== null && lng() !== null) {
            Punto marcado. Tocá el mapa para moverlo.
          } @else {
            Tocá el mapa para marcar dónde entregamos.
          }
        </small>
      </div>
      @if (errorUbicacion()) {
        <div class="small text-danger mt-1">{{ errorUbicacion() }}</div>
      }
    </div>
  `,
  styles: `
    .mapa-selector__mapa {
      width: 100%;
      height: 280px;
      border-radius: 0.5rem;
      overflow: hidden;
      border: 1px solid var(--bs-border-color);
      cursor: crosshair;
    }
  `,
})
export class MapaSelectorComponent {
  readonly lat = input<number | null>(null);
  readonly lng = input<number | null>(null);
  readonly puntoCambiado = output<PuntoMapa>();

  readonly buscandoUbicacion = signal(false);
  readonly errorUbicacion = signal('');

  private readonly contenedor = viewChild.required<ElementRef<HTMLDivElement>>('contenedor');
  private readonly destroyRef = inject(DestroyRef);
  private readonly ubicacionService = inject(UbicacionService);

  private mapa: OlMap | null = null;
  private readonly pin = new Feature<Point>();
  private readonly capaPin = new VectorLayer({
    source: new VectorSource({ features: [this.pin] }),
    style: new Style({
      image: new Circle({
        radius: 9,
        fill: new Fill({ color: '#dc3545' }),
        stroke: new Stroke({ color: '#ffffff', width: 3 }),
      }),
    }),
  });

  constructor() {
    //OpenLayers necesita el div ya en el DOM
    afterNextRender(() => this.crearMapa());

    //si el padre cambia el punto (por ejemplo al editar otra direccion) se mueve el pin
    effect(() => {
      const lat = this.lat();
      const lng = this.lng();
      if (!this.mapa) return;
      this.dibujarPin(lat, lng, true);
    });

    this.destroyRef.onDestroy(() => {
      this.mapa?.setTarget(undefined);
      this.mapa = null;
    });
  }

  async usarMiUbicacion(): Promise<void> {
    this.buscandoUbicacion.set(true);
    this.errorUbicacion.set('');
    try {
      const { lat, lng } = await this.ubicacionService.obtenerPosicion();
      this.elegir({ lat: redondear(lat), lng: redondear(lng) });
    } catch (error) {
      const motivo = error instanceof UbicacionError ? error.message : 'No se pudo obtener tu ubicación.';
      this.errorUbicacion.set(`${motivo} Marcala tocando el mapa.`);
    } finally {
      this.buscandoUbicacion.set(false);
    }
  }

  private crearMapa(): void {
    const { centro, zoom } = environment.mapa;
    const lat = this.lat();
    const lng = this.lng();
    const tienePunto = lat !== null && lng !== null;

    this.mapa = new OlMap({
      target: this.contenedor().nativeElement,
      layers: [new TileLayer({ source: new OSM() }), this.capaPin],
      view: new View({
        center: fromLonLat(tienePunto ? [lng, lat] : [centro.lng, centro.lat]),
        zoom: tienePunto ? ZOOM_CON_PUNTO : zoom,
      }),
    });

    this.dibujarPin(lat, lng, false);

    this.mapa.on('singleclick', (evento) => {
      const [lngElegida, latElegida] = toLonLat(evento.coordinate);
      this.elegir({ lat: redondear(latElegida), lng: redondear(lngElegida) });
    });
  }

  private elegir(punto: PuntoMapa): void {
    this.dibujarPin(punto.lat, punto.lng, true);
    this.puntoCambiado.emit(punto);
  }

  private dibujarPin(lat: number | null, lng: number | null, centrar: boolean): void {
    if (lat === null || lng === null) {
      this.pin.setGeometry(undefined);
      return;
    }
    const coordenada = fromLonLat([lng, lat]);
    this.pin.setGeometry(new Point(coordenada));
    if (centrar) {
      this.mapa?.getView().animate({ center: coordenada, duration: 250 });
    }
  }
}

//6 decimales ~ 10 cm, de sobra para una direccion
function redondear(valor: number): number {
  return Math.round(valor * 1e6) / 1e6;
}
