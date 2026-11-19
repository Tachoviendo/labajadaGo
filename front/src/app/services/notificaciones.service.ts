import { Injectable, signal } from '@angular/core';

export type Aviso = {
  id: number;
  tipo: 'exito' | 'error';
  mensaje: string;
};

//avisos cortos que se muestran como toasts (ver components/toasts) y se van solos
@Injectable({ providedIn: 'root' })
export class NotificacionesService {
  #siguienteId = 1;
  readonly #avisos = signal<Aviso[]>([]);

  readonly avisos = this.#avisos.asReadonly();

  exito(mensaje: string): void {
    this.#agregar('exito', mensaje);
  }

  error(mensaje: string): void {
    this.#agregar('error', mensaje);
  }

  quitar(id: number): void {
    this.#avisos.update((avisos) => avisos.filter((aviso) => aviso.id !== id));
  }

  #agregar(tipo: Aviso['tipo'], mensaje: string): void {
    const aviso: Aviso = { id: this.#siguienteId++, tipo, mensaje };
    this.#avisos.update((avisos) => [...avisos, aviso]);
  }
}
