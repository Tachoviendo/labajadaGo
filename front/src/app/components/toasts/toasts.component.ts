import { Component, inject } from '@angular/core';
import { NgbToast } from '@ng-bootstrap/ng-bootstrap';

import { NotificacionesService } from '../../services/notificaciones.service';

//muestra los avisos de NotificacionesService. va una sola vez, en app.html
@Component({
  selector: 'app-toasts',
  imports: [NgbToast],
  template: `
    @for (aviso of notificaciones.avisos(); track aviso.id) {
      <ngb-toast
        [class]="aviso.tipo === 'error' ? 'text-bg-danger' : 'text-bg-success'"
        [autohide]="true"
        [delay]="aviso.tipo === 'error' ? 6000 : 3500"
        (hidden)="notificaciones.quitar(aviso.id)"
      >
        {{ aviso.mensaje }}
      </ngb-toast>
    }
  `,
  styles: `
    :host {
      position: fixed;
      top: 0;
      right: 0;
      z-index: 1200;
      margin: 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
  `,
})
export class ToastsComponent {
  protected readonly notificaciones = inject(NotificacionesService);
}
