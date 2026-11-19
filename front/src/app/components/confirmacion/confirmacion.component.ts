import { Component, inject, signal } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import { OpcionesConfirmacion } from '../../services/confirmacion.service';

//contenido del modal de confirmacion. no se usa directo: se abre con ConfirmacionService,
//que le carga las opciones (NgbModal no le pasa valores a los input(), por eso es un signal)
@Component({
  selector: 'app-confirmacion',
  template: `
    @let o = opciones();
    <div class="modal-header">
      <h2 class="modal-title fs-5">{{ o.titulo }}</h2>
      <button type="button" class="btn-close" aria-label="Cerrar" (click)="modal.dismiss()"></button>
    </div>
    @if (o.mensaje) {
      <div class="modal-body">
        <p class="mb-0">{{ o.mensaje }}</p>
      </div>
    }
    <div class="modal-footer">
      <button type="button" class="btn btn-outline-secondary" (click)="modal.dismiss()">
        {{ o.textoCancelar ?? 'Volver' }}
      </button>
      <button
        type="button"
        class="btn"
        [class.btn-danger]="o.peligro"
        [class.btn-primary]="!o.peligro"
        (click)="modal.close(true)"
      >
        {{ o.textoConfirmar ?? 'Confirmar' }}
      </button>
    </div>
  `,
})
export class ConfirmacionComponent {
  //el modal abierto: close() confirma, dismiss() cancela (tambien Esc o click afuera)
  protected readonly modal = inject(NgbActiveModal);

  readonly opciones = signal<OpcionesConfirmacion>({ titulo: '' });
}
