import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import {
  AddressesService,
  CrearDireccionBody,
  Direccion,
  tieneUbicacion,
} from '../../../services/addresses.service';
import { mensajeDeError } from '../../../services/api-error';
import {
  MapaSelectorComponent,
  PuntoMapa,
} from '../../../components/mapa-selector/mapa-selector.component';

type Formulario = {
  calle: string;
  numero: string;
  ciudad: string;
  referencia: string;
  lat: number | null;
  lng: number | null;
};

const FORMULARIO_VACIO: Formulario = {
  calle: '',
  numero: '',
  ciudad: 'Salto',
  referencia: '',
  lat: null,
  lng: null,
};

//la api no tiene DELETE /direcciones: por ahora se listan, se crean y se editan
@Component({
  selector: 'app-mis-direcciones',
  imports: [FormsModule, RouterLink, MapaSelectorComponent],
  templateUrl: './mis-direcciones.page.html',
  styleUrl: './mis-direcciones.page.css',
})
export class MisDireccionesPage implements OnInit {
  private readonly addressesService = inject(AddressesService);

  readonly tieneUbicacion = tieneUbicacion;

  readonly direcciones = signal<Direccion[]>([]);
  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly error = signal('');
  readonly mensaje = signal('');

  //null: formulario cerrado. 'nueva': alta. numero: id de la direccion que se edita
  readonly editando = signal<'nueva' | number | null>(null);
  readonly formulario = signal<Formulario>({ ...FORMULARIO_VACIO });

  async ngOnInit(): Promise<void> {
    try {
      this.direcciones.set(await firstValueFrom(this.addressesService.listar()));
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.cargando.set(false);
    }
  }

  nueva(): void {
    this.limpiarMensajes();
    this.formulario.set({ ...FORMULARIO_VACIO });
    this.editando.set('nueva');
  }

  editar(direccion: Direccion): void {
    this.limpiarMensajes();
    this.formulario.set({
      calle: direccion.calle,
      numero: direccion.numero ?? '',
      ciudad: direccion.ciudad,
      referencia: direccion.referencia ?? '',
      lat: direccion.lat,
      lng: direccion.lng,
    });
    this.editando.set(direccion.id);
  }

  cancelar(): void {
    this.editando.set(null);
    this.error.set('');
  }

  actualizarCampo(campo: 'calle' | 'numero' | 'ciudad' | 'referencia', valor: string): void {
    this.formulario.update((actual) => ({ ...actual, [campo]: valor }));
  }

  marcarPunto(punto: PuntoMapa): void {
    this.formulario.update((actual) => ({ ...actual, lat: punto.lat, lng: punto.lng }));
  }

  async guardar(): Promise<void> {
    this.limpiarMensajes();
    const datos = this.formulario();
    const calle = datos.calle.trim();
    const ciudad = datos.ciudad.trim();

    if (calle.length < 2 || ciudad.length < 2) {
      this.error.set('La calle y la ciudad son obligatorias.');
      return;
    }
    if (datos.lat === null || datos.lng === null) {
      this.error.set('Marcá en el mapa dónde querés recibir los pedidos.');
      return;
    }

    const body: CrearDireccionBody = {
      calle,
      ciudad,
      numero: datos.numero.trim() || undefined,
      referencia: datos.referencia.trim() || undefined,
      lat: datos.lat,
      lng: datos.lng,
    };

    const editando = this.editando();
    this.guardando.set(true);
    try {
      if (editando === 'nueva') {
        const creada = await firstValueFrom(this.addressesService.crear(body));
        this.direcciones.update((lista) => [...lista, creada]);
        this.mensaje.set('Dirección agregada.');
      } else if (editando !== null) {
        const actualizada = await firstValueFrom(this.addressesService.actualizar(editando, body));
        this.direcciones.update((lista) =>
          lista.map((direccion) => (direccion.id === actualizada.id ? actualizada : direccion)),
        );
        this.mensaje.set('Dirección actualizada.');
      }
      this.editando.set(null);
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.guardando.set(false);
    }
  }

  private limpiarMensajes(): void {
    this.error.set('');
    this.mensaje.set('');
  }
}

export default MisDireccionesPage;
