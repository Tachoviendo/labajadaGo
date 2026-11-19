import { Component, input, linkedSignal, output } from '@angular/core';
import { form, FormField, maxLength, required, submit, validate } from '@angular/forms/signals';

import { CrearDireccionBody, Direccion } from '../../services/addresses.service';
import { MapaSelectorComponent, PuntoMapa } from '../mapa-selector/mapa-selector.component';

type ModeloDireccion = {
  calle: string;
  numero: string;
  ciudad: string;
  referencia: string;
  //null hasta que se marca el punto en el mapa
  lat: number | null;
  lng: number | null;
};

function aModelo(direccion: Direccion | null): ModeloDireccion {
  return {
    calle: direccion?.calle ?? '',
    numero: direccion?.numero ?? '',
    ciudad: direccion?.ciudad ?? 'Salto',
    referencia: direccion?.referencia ?? '',
    lat: direccion?.lat ?? null,
    lng: direccion?.lng ?? null,
  };
}

//formulario de alta/edicion de direccion (signal forms + mapa). lo usan "Mis direcciones"
//y el checkout. el padre hace el POST/PATCH con lo que emite (guardado)
@Component({
  selector: 'app-formulario-direccion',
  imports: [FormField, MapaSelectorComponent],
  templateUrl: './formulario-direccion.component.html',
})
export class FormularioDireccionComponent {
  //direccion a editar; null es alta
  readonly direccion = input<Direccion | null>(null);
  readonly guardando = input(false);
  readonly textoGuardar = input('Guardar');

  readonly guardado = output<CrearDireccionBody>();
  readonly cancelado = output<void>();

  //si cambia la direccion a editar, el formulario arranca de nuevo con sus datos
  protected readonly modelo = linkedSignal(() => aModelo(this.direccion()));

  //mismas reglas que CreateAddressBody en la api
  protected readonly direccionForm = form(this.modelo, (path) => {
    required(path.calle, { message: 'La calle es obligatoria.' });
    maxLength(path.calle, 150, { message: 'La calle puede tener hasta 150 caracteres.' });
    maxLength(path.numero, 20, { message: 'El número puede tener hasta 20 caracteres.' });
    required(path.ciudad, { message: 'La ciudad es obligatoria.' });
    maxLength(path.ciudad, 100, { message: 'La ciudad puede tener hasta 100 caracteres.' });
    maxLength(path.referencia, 200, {
      message: 'La referencia puede tener hasta 200 caracteres.',
    });
    validate(path.lat, ({ value }) =>
      value() === null
        ? { kind: 'sinUbicacion', message: 'Marcá en el mapa dónde querés recibir los pedidos.' }
        : null,
    );
  });

  protected marcarPunto(punto: PuntoMapa): void {
    this.modelo.update((actual) => ({ ...actual, lat: punto.lat, lng: punto.lng }));
    this.direccionForm.lat().markAsTouched();
  }

  protected enviar(event: Event): void {
    event.preventDefault();
    //submit marca todo como tocado y solo sigue si el form es valido
    submit(this.direccionForm, async () => {
      const datos = this.modelo();
      if (datos.lat === null || datos.lng === null) return;
      this.guardado.emit({
        calle: datos.calle.trim(),
        ciudad: datos.ciudad.trim(),
        numero: datos.numero.trim() || undefined,
        referencia: datos.referencia.trim() || undefined,
        lat: datos.lat,
        lng: datos.lng,
      });
    });
  }
}
