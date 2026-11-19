import { Injectable, inject } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

import { ConfirmacionComponent } from '../components/confirmacion/confirmacion.component';

export type OpcionesConfirmacion = {
  titulo: string;
  mensaje?: string;
  textoConfirmar?: string;
  textoCancelar?: string;
  peligro?: boolean;
};

//reemplazo de window.confirm() con un modal de ng-bootstrap (NgbModal), con el estilo de la app:
//  if (!(await this.confirmacion.preguntar({ titulo: '¿Cancelar el pedido?', peligro: true }))) return;
@Injectable({ providedIn: 'root' })
export class ConfirmacionService {
  readonly #modal = inject(NgbModal);

  //true si confirmo; false si cancelo, cerro con la cruz, Esc o click afuera
  async preguntar(opciones: OpcionesConfirmacion): Promise<boolean> {
    const ref = this.#modal.open(ConfirmacionComponent, { centered: true });
    (ref.componentInstance as ConfirmacionComponent).opciones.set(opciones);
    try {
      return (await ref.result) === true;
    } catch {
      return false; //dismiss() rechaza la promesa
    }
  }
}
