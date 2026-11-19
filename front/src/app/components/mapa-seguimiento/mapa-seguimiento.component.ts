import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  effect,
  inject,
  input,
  viewChild,
} from '@angular/core';
import OlMap from 'ol/Map';
import View from 'ol/View';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import LineString from 'ol/geom/LineString';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import OSM from 'ol/source/OSM';
import { Circle, Fill, Stroke, Style, Text } from 'ol/style';
import { fromLonLat } from 'ol/proj';
import { containsCoordinate, createEmpty, extend, isEmpty } from 'ol/extent';

import { environment } from '../../../environments/environment';
import { Coordenada, PuntoRecorrido } from '../../services/seguimiento.service';

const COLORES = {
  local: '#0d6efd',
  destino: '#198754',
  recorrido: '#fd7e14',
  repartidor: '#dc3545',
};

function marcador(color: string, radio: number, etiqueta?: string): Style {
  return new Style({
    image: new Circle({
      radius: radio,
      fill: new Fill({ color }),
      stroke: new Stroke({ color: '#ffffff', width: 3 }),
    }),
    text: etiqueta
      ? new Text({
          text: etiqueta,
          offsetY: -radio - 12,
          font: '600 12px system-ui, sans-serif',
          fill: new Fill({ color: '#212529' }),
          stroke: new Stroke({ color: '#ffffff', width: 3 }),
        })
      : undefined,
  });
}

function aMapa(punto: Coordenada): number[] {
  return fromLonLat([punto.lng, punto.lat]);
}

//mapa del reparto: local (origen), casa del cliente (destino), el recorrido hecho y la
//posicion actual del repartidor. lo usan el cliente y el repartidor: el padre le pasa los
//puntos (del GET /recorrido + los que llegan por websocket) y el mapa se redibuja solo
@Component({
  selector: 'app-mapa-seguimiento',
  template: `
    <div #contenedor class="mapa-seguimiento" role="img" [attr.aria-label]="descripcion()"></div>
    <div class="d-flex flex-wrap gap-3 small text-body-secondary mt-2">
      <span><span class="punto" [style.background]="colores.local"></span> Local</span>
      <span><span class="punto" [style.background]="colores.destino"></span> Destino</span>
      <span><span class="punto" [style.background]="colores.repartidor"></span> Repartidor</span>
      <span><span class="linea" [style.background]="colores.recorrido"></span> Recorrido</span>
    </div>
  `,
  styles: `
    .mapa-seguimiento {
      width: 100%;
      height: var(--alto-mapa, 360px);
      border-radius: 0.5rem;
      overflow: hidden;
      border: 1px solid var(--bs-border-color);
    }
    .punto {
      display: inline-block;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      vertical-align: middle;
    }
    .linea {
      display: inline-block;
      width: 16px;
      height: 3px;
      vertical-align: middle;
    }
  `,
})
export class MapaSeguimientoComponent {
  readonly origen = input<Coordenada | null>(null);
  readonly destino = input<Coordenada | null>(null);
  readonly puntos = input<PuntoRecorrido[]>([]);
  //si el repartidor sale de la vista, el mapa lo sigue
  readonly seguirRepartidor = input(true);
  //en el texto del marcador del repartidor (ej: "Pedro" o "Vos")
  readonly etiquetaRepartidor = input('Repartidor');

  readonly colores = COLORES;

  private readonly contenedor = viewChild.required<ElementRef<HTMLDivElement>>('contenedor');
  private readonly destroyRef = inject(DestroyRef);

  private mapa: OlMap | null = null;
  private encuadrado = false;

  private readonly origenFeature = new Feature<Point>();
  private readonly destinoFeature = new Feature<Point>();
  private readonly recorridoFeature = new Feature<LineString>();
  private readonly repartidorFeature = new Feature<Point>();

  constructor() {
    this.origenFeature.setStyle(marcador(COLORES.local, 8, 'Local'));
    this.destinoFeature.setStyle(marcador(COLORES.destino, 8, 'Destino'));
    this.recorridoFeature.setStyle(
      new Style({ stroke: new Stroke({ color: COLORES.recorrido, width: 4, lineDash: [8, 6] }) }),
    );

    afterNextRender(() => this.crearMapa());

    effect(() => {
      const origen = this.origen();
      const destino = this.destino();
      const puntos = this.puntos();
      const etiqueta = this.etiquetaRepartidor();
      if (!this.mapa) return;
      this.dibujar(origen, destino, puntos, etiqueta);
    });

    this.destroyRef.onDestroy(() => {
      this.mapa?.setTarget(undefined);
      this.mapa = null;
    });
  }

  descripcion(): string {
    const puntos = this.puntos();
    return puntos.length
      ? `Mapa del reparto con ${puntos.length} puntos del recorrido`
      : 'Mapa del reparto';
  }

  private crearMapa(): void {
    const { centro, zoom } = environment.mapa;
    this.mapa = new OlMap({
      target: this.contenedor().nativeElement,
      layers: [
        new TileLayer({ source: new OSM() }),
        new VectorLayer({
          source: new VectorSource({
            features: [this.recorridoFeature, this.origenFeature, this.destinoFeature, this.repartidorFeature],
          }),
        }),
      ],
      view: new View({ center: fromLonLat([centro.lng, centro.lat]), zoom }),
    });
    this.dibujar(this.origen(), this.destino(), this.puntos(), this.etiquetaRepartidor());
  }

  private dibujar(
    origen: Coordenada | null,
    destino: Coordenada | null,
    puntos: PuntoRecorrido[],
    etiqueta: string,
  ): void {
    this.origenFeature.setGeometry(origen ? new Point(aMapa(origen)) : undefined);
    this.destinoFeature.setGeometry(destino ? new Point(aMapa(destino)) : undefined);

    const linea = puntos.map(aMapa);
    this.recorridoFeature.setGeometry(linea.length > 1 ? new LineString(linea) : undefined);

    const ultimo = linea.at(-1);
    this.repartidorFeature.setGeometry(ultimo ? new Point(ultimo) : undefined);
    this.repartidorFeature.setStyle(marcador(COLORES.repartidor, 10, etiqueta));

    if (!this.encuadrado) {
      this.encuadrarTodo();
    } else if (ultimo && this.seguirRepartidor()) {
      this.seguir(ultimo);
    }
  }

  //la primera vez muestra local, destino y recorrido completos
  private encuadrarTodo(): void {
    const extension = createEmpty();
    for (const feature of [this.origenFeature, this.destinoFeature, this.recorridoFeature, this.repartidorFeature]) {
      const geometria = feature.getGeometry();
      if (geometria) extend(extension, geometria.getExtent());
    }
    if (isEmpty(extension) || !this.mapa) return;
    this.mapa.getView().fit(extension, { padding: [48, 48, 48, 48], maxZoom: 17 });
    this.encuadrado = true;
  }

  //si el repartidor se va de la parte visible, centra el mapa en el
  private seguir(posicion: number[]): void {
    const vista = this.mapa?.getView();
    const tamano = this.mapa?.getSize();
    if (!vista || !tamano) return;
    const visible = vista.calculateExtent(tamano);
    if (!containsCoordinate(visible, posicion)) {
      vista.animate({ center: posicion, duration: 400 });
    }
  }
}
