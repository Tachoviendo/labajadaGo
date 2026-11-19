import {
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';

type EstadoCamara = 'apagada' | 'iniciando' | 'activa' | 'error';

//camara en vivo con la api nativa del navegador (getUserMedia), sin plugins.
//anda igual en la web, en la PWA instalada y en la app de Android (el webview de Capacitor
//pide el permiso de camara de Android; esta declarado en AndroidManifest.xml).
//necesita https o localhost, como la ubicacion.
//  <app-camara (capturada)="fotoTomada($event)" />
@Component({
  selector: 'app-camara',
  template: `
    <div class="camara">
      <!-- el video siempre existe (viewChild), se muestra solo con la camara prendida -->
      <video #video [hidden]="estado() !== 'activa'" playsinline muted></video>

      @switch (estado()) {
        @case ('apagada') {
          <button type="button" class="btn btn-primary btn-lg" (click)="encender()">
            {{ textoBoton() }}
          </button>
        }
        @case ('iniciando') {
          <p class="ayuda">
            <span class="spinner-border spinner-border-sm" aria-hidden="true"></span>
            Abriendo la cámara…
          </p>
        }
        @case ('activa') {
          <div class="acciones">
            <button type="button" class="btn btn-outline-secondary" (click)="apagar()">Cancelar</button>
            <button type="button" class="btn btn-primary btn-lg disparador" (click)="sacarFoto()">
              Sacar foto
            </button>
          </div>
        }
        @case ('error') {
          <div class="alert alert-warning mb-0" role="alert">
            <p class="mb-2">{{ error() }}</p>
            <button type="button" class="btn btn-sm btn-warning" (click)="encender()">Reintentar</button>
          </div>
        }
      }
    </div>
  `,
  styles: `
    .camara {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    video {
      width: 100%;
      max-height: 24rem;
      border-radius: 0.5rem;
      background: #000;
      object-fit: cover;
    }
    .acciones {
      display: flex;
      gap: 0.5rem;
    }
    .disparador {
      flex: 1;
    }
    .ayuda {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0;
      color: #6b7280;
    }
  `,
})
export class CamaraComponent {
  //texto del boton para abrir la camara
  readonly textoBoton = input('Abrir cámara');
  //lado mas largo de la foto en px (la api acepta hasta 5 MB; asi queda en ~300 KB)
  readonly ladoMaximo = input(1600);

  //la foto en jpeg
  readonly capturada = output<Blob>();

  protected readonly estado = signal<EstadoCamara>('apagada');
  protected readonly error = signal('');

  private readonly video = viewChild.required<ElementRef<HTMLVideoElement>>('video');
  #stream: MediaStream | null = null;

  constructor() {
    //al salir de la pantalla se apaga la camara (si no, queda la lucecita prendida)
    inject(DestroyRef).onDestroy(() => this.apagar());
  }

  protected async encender() {
    //sin https (o localhost) el navegador no expone mediaDevices
    if (!navigator.mediaDevices?.getUserMedia) {
      this.fallar('Este navegador no permite usar la cámara (hace falta https).');
      return;
    }
    this.estado.set('iniciando');
    try {
      this.#stream = await navigator.mediaDevices.getUserMedia({
        //'environment' = camara trasera en el celular; en la compu usa la webcam
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      const video = this.video().nativeElement;
      video.srcObject = this.#stream;
      await video.play();
      this.estado.set('activa');
    } catch (error) {
      this.apagar();
      this.fallar(traducir(error));
    }
  }

  //dibuja el cuadro actual del video en un canvas y lo exporta a jpeg
  protected sacarFoto() {
    const video = this.video().nativeElement;
    if (!video.videoWidth) return;
    const escala = Math.min(1, this.ladoMaximo() / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(video.videoWidth * escala);
    canvas.height = Math.round(video.videoHeight * escala);
    canvas.getContext('2d')!.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          this.fallar('No se pudo sacar la foto. Probá de nuevo.');
          return;
        }
        this.apagar();
        this.capturada.emit(blob);
      },
      'image/jpeg',
      0.85,
    );
  }

  protected apagar() {
    this.#stream?.getTracks().forEach((track) => track.stop());
    this.#stream = null;
    if (this.estado() !== 'error') this.estado.set('apagada');
  }

  private fallar(mensaje: string) {
    this.error.set(mensaje);
    this.estado.set('error');
  }
}

function traducir(error: unknown): string {
  const nombre = (error as { name?: string })?.name;
  switch (nombre) {
    case 'NotAllowedError':
      return 'Sin permiso para usar la cámara. Activalo en los ajustes del navegador o de la app.';
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'No se encontró ninguna cámara en este dispositivo.';
    case 'NotReadableError':
      return 'La cámara la está usando otra aplicación.';
    default:
      return 'No se pudo abrir la cámara.';
  }
}
