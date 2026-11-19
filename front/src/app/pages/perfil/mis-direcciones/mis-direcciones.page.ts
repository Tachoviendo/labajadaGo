import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { NgbAlert } from '@ng-bootstrap/ng-bootstrap';

import {
  AddressesService,
  CrearDireccionBody,
  Direccion,
  tieneUbicacion,
} from '../../../services/addresses.service';
import { mensajeDeError } from '../../../services/api-error';
import { NotificacionesService } from '../../../services/notificaciones.service';
import { FormularioDireccionComponent } from '../../../components/formulario-direccion/formulario-direccion.component';

//la api no tiene DELETE /direcciones: por ahora se listan, se crean y se editan
@Component({
  selector: 'app-mis-direcciones',
  imports: [RouterLink, NgbAlert, FormularioDireccionComponent],
  templateUrl: './mis-direcciones.page.html',
  styleUrl: './mis-direcciones.page.css',
})
export class MisDireccionesPage {
  readonly #addressesService = inject(AddressesService);
  readonly #notificaciones = inject(NotificacionesService);

  protected readonly tieneUbicacion = tieneUbicacion;
  protected readonly mensajeDeError = mensajeDeError;

  protected readonly direcciones = rxResource({
    stream: () => this.#addressesService.listar(),
  });

  protected readonly guardando = signal(false);
  protected readonly errorGuardar = signal<string | null>(null);

  //null: formulario cerrado. 'nueva': alta. numero: id de la direccion que se edita
  protected readonly editando = signal<'nueva' | number | null>(null);

  protected readonly direccionEditada = computed<Direccion | null>(() => {
    const id = this.editando();
    if (typeof id !== 'number' || !this.direcciones.hasValue()) return null;
    return this.direcciones.value().find((direccion) => direccion.id === id) ?? null;
  });

  protected nueva(): void {
    this.errorGuardar.set(null);
    this.editando.set('nueva');
  }

  protected editar(direccion: Direccion): void {
    this.errorGuardar.set(null);
    this.editando.set(direccion.id);
  }

  protected cancelar(): void {
    this.editando.set(null);
    this.errorGuardar.set(null);
  }

  protected async guardar(body: CrearDireccionBody): Promise<void> {
    const editando = this.editando();
    this.errorGuardar.set(null);
    this.guardando.set(true);
    try {
      if (editando === 'nueva') {
        const creada = await firstValueFrom(this.#addressesService.crear(body));
        this.#actualizarLista((lista) => [...lista, creada]);
        this.#notificaciones.exito('Dirección agregada.');
      } else if (editando !== null) {
        const actualizada = await firstValueFrom(this.#addressesService.actualizar(editando, body));
        this.#actualizarLista((lista) =>
          lista.map((direccion) => (direccion.id === actualizada.id ? actualizada : direccion)),
        );
        this.#notificaciones.exito('Dirección actualizada.');
      }
      this.editando.set(null);
    } catch (error) {
      this.errorGuardar.set(mensajeDeError(error));
    } finally {
      this.guardando.set(false);
    }
  }

  //actualiza la lista sin volver a pedirla. si no habia cargado (error), la pide de nuevo
  #actualizarLista(cambio: (lista: Direccion[]) => Direccion[]): void {
    if (this.direcciones.hasValue()) {
      this.direcciones.value.set(cambio(this.direcciones.value()));
    } else {
      this.direcciones.reload();
    }
  }
}

export default MisDireccionesPage;
