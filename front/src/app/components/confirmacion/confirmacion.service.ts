import { Component, Injectable, inject, signal } from '@angular/core';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';

export type OpcionesConfirmacion = {
  titulo: string;
  mensaje: string;
  textoConfirmar?: string;
  textoCancelar?: string;
  //acciones que borran o no se pueden deshacer: el boton queda en rojo
  peligro?: boolean;
};

//contenido del modal. lo abre ConfirmacionService, no se usa directo en un template
@Component({
  selector: 'app-confirmacion-modal',
  template: `
    <div class="modal-header">
      <h2 class="modal-title h5">{{ opciones().titulo }}</h2>
      <button type="button" class="btn-close" aria-label="Cerrar" (click)="modal.dismiss()"></button>
    </div>
    <div class="modal-body">
      <p class="mb-0">{{ opciones().mensaje }}</p>
    </div>
    <div class="modal-footer">
      <button type="button" class="btn btn-outline-secondary" (click)="modal.dismiss()">
        {{ opciones().textoCancelar ?? 'Cancelar' }}
      </button>
      <button
        type="button"
        class="btn"
        [class.btn-danger]="opciones().peligro"
        [class.btn-primary]="!opciones().peligro"
        (click)="modal.close(true)"
      >
        {{ opciones().textoConfirmar ?? 'Confirmar' }}
      </button>
    </div>
  `,
})
export class ConfirmacionModal {
  protected readonly modal = inject(NgbActiveModal);
  //lo setea ConfirmacionService al abrir el modal
  readonly opciones = signal<OpcionesConfirmacion>({ titulo: '', mensaje: '' });
}

//reemplaza al confirm() nativo con un modal de ng-bootstrap.
//uso: if (!(await this.#confirmacion.confirmar({ titulo, mensaje }))) return;
@Injectable({ providedIn: 'root' })
export class ConfirmacionService {
  readonly #modal = inject(NgbModal);

  async confirmar(opciones: OpcionesConfirmacion): Promise<boolean> {
    const ref = this.#modal.open(ConfirmacionModal, { centered: true });
    (ref.componentInstance as ConfirmacionModal).opciones.set(opciones);
    try {
      return (await ref.result) === true;
    } catch {
      //cerrado con la X, Cancelar, Escape o click afuera
      return false;
    }
  }
}
