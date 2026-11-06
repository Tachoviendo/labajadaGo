import { Component, inject, resource, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { form, FormField, maxLength, minLength, required, submit } from '@angular/forms/signals';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonIcon,
  IonInput,
  IonNote,
  IonSpinner,
  IonText,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { addOutline, createOutline, locationOutline } from 'ionicons/icons';

import { CrearDireccionBody, Direccion } from '../../../models/direccion.model';
import { mensajeDeError } from '../../../services/api-error';
import { DireccionesService } from '../../../services/direcciones.service';

const MODELO_VACIO = { calle: '', numero: '', ciudad: '', referencia: '' };

@Component({
  selector: 'app-mis-direcciones',
  imports: [
    FormField,
    IonButton,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardSubtitle,
    IonCardTitle,
    IonIcon,
    IonInput,
    IonNote,
    IonSpinner,
    IonText,
  ],
  templateUrl: './mis-direcciones.page.html',
  styleUrl: './mis-direcciones.page.css',
})
export class MisDireccionesPage {
  readonly #direccionesService = inject(DireccionesService);
  readonly #router = inject(Router);
  readonly #route = inject(ActivatedRoute);

  protected readonly direcciones = resource({
    loader: () => this.#direccionesService.listar(),
  });

  //null: formulario cerrado, 'nueva': alta, un numero: edicion de esa direccion
  protected readonly editando = signal<number | 'nueva' | null>(null);
  protected readonly mensajeError = signal<string | null>(null);
  protected readonly mensajeExito = signal<string | null>(null);

  protected readonly direccionModel = signal({ ...MODELO_VACIO });

  //mismas reglas que AddressCreateBody en la api
  protected readonly direccionForm = form(this.direccionModel, (schemaPath) => {
    required(schemaPath.calle, { message: 'La calle es obligatoria.' });
    minLength(schemaPath.calle, 2, { message: 'La calle debe tener al menos 2 caracteres.' });
    maxLength(schemaPath.calle, 150, { message: 'La calle puede tener hasta 150 caracteres.' });
    maxLength(schemaPath.numero, 20, { message: 'El número puede tener hasta 20 caracteres.' });
    required(schemaPath.ciudad, { message: 'La ciudad es obligatoria.' });
    minLength(schemaPath.ciudad, 2, { message: 'La ciudad debe tener al menos 2 caracteres.' });
    maxLength(schemaPath.ciudad, 100, { message: 'La ciudad puede tener hasta 100 caracteres.' });
    maxLength(schemaPath.referencia, 200, {
      message: 'La referencia puede tener hasta 200 caracteres.',
    });
  });

  constructor() {
    addIcons({ addOutline, createOutline, locationOutline });
    //si se llega desde el checkout sin direcciones, se abre directo el alta
    if (this.#route.snapshot.queryParamMap.has('volver')) {
      this.nueva();
    }
  }

  protected nueva() {
    this.abrirFormulario('nueva', { ...MODELO_VACIO });
  }

  protected editar(direccion: Direccion) {
    this.abrirFormulario(direccion.id, {
      calle: direccion.calle,
      numero: direccion.numero ?? '',
      ciudad: direccion.ciudad,
      referencia: direccion.referencia ?? '',
    });
  }

  protected cancelar() {
    this.editando.set(null);
    this.mensajeError.set(null);
  }

  protected guardar(event: Event) {
    event.preventDefault();
    this.mensajeError.set(null);
    this.mensajeExito.set(null);
    //submit marca todos los campos como tocados y solo sigue si el form es valido
    submit(this.direccionForm, async () => {
      const editando = this.editando();
      try {
        if (editando === 'nueva') {
          await this.#direccionesService.crear(this.datosParaCrear());
          this.mensajeExito.set('La dirección se agregó.');
        } else if (editando !== null) {
          //en la edicion se mandan todos los campos, asi un campo vaciado tambien se guarda
          await this.#direccionesService.actualizar(editando, this.direccionModel());
          this.mensajeExito.set('La dirección se guardó.');
        }
        this.editando.set(null);
        this.direcciones.reload();

        //si vino desde el checkout, vuelve ahi
        const volver = this.#route.snapshot.queryParamMap.get('volver');
        if (volver?.startsWith('/')) {
          await this.#router.navigateByUrl(volver);
        }
      } catch (error) {
        this.mensajeError.set(mensajeDeError(error));
      }
    });
  }

  protected mensajeDeError(error: unknown) {
    return mensajeDeError(error);
  }

  private abrirFormulario(editando: number | 'nueva', modelo: typeof MODELO_VACIO) {
    this.mensajeError.set(null);
    this.mensajeExito.set(null);
    this.direccionModel.set(modelo);
    this.direccionForm().reset();
    this.editando.set(editando);
  }

  //numero y referencia son opcionales en la api, si quedaron vacios no se mandan
  private datosParaCrear(): CrearDireccionBody {
    const modelo = this.direccionModel();
    const datos: CrearDireccionBody = { calle: modelo.calle, ciudad: modelo.ciudad };
    if (modelo.numero !== '') datos.numero = modelo.numero;
    if (modelo.referencia !== '') datos.referencia = modelo.referencia;
    return datos;
  }
}

export default MisDireccionesPage;
