import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  email,
  form,
  FormField,
  maxLength,
  minLength,
  required,
  submit,
  validate,
} from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';

import { RegisterBody } from '../../../models/auth.model';
import { mensajeDeError } from '../../../services/api-error';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-registro',
  imports: [FormField, RouterLink],
  templateUrl: './registro.page.html',
  styleUrl: './registro.page.css',
})
export class RegistroPage {
  readonly #authService = inject(AuthService);
  readonly #router = inject(Router);

  //mensaje de la api cuando el registro falla (ej: email repetido)
  protected readonly mensajeError = signal<string | null>(null);

  protected readonly registroModel = signal({
    nombre: '',
    email: '',
    password: '',
    confirmacion: '',
    telefono: '',
  });

  //mismas reglas que RegisterBody en la api, mas la confirmacion
  protected readonly registroForm = form(this.registroModel, (schemaPath) => {
    required(schemaPath.nombre, { message: 'El nombre es obligatorio.' });
    minLength(schemaPath.nombre, 2, { message: 'El nombre debe tener al menos 2 caracteres.' });
    maxLength(schemaPath.nombre, 100, { message: 'El nombre puede tener hasta 100 caracteres.' });

    required(schemaPath.email, { message: 'El email es obligatorio.' });
    email(schemaPath.email, { message: 'El email no tiene un formato válido.' });
    maxLength(schemaPath.email, 150, { message: 'El email puede tener hasta 150 caracteres.' });

    required(schemaPath.password, { message: 'La contraseña es obligatoria.' });
    minLength(schemaPath.password, 8, {
      message: 'La contraseña debe tener al menos 8 caracteres.',
    });
    maxLength(schemaPath.password, 72, {
      message: 'La contraseña puede tener hasta 72 caracteres.',
    });
    validate(schemaPath.confirmacion, ({ value, valueOf }) => {
      if (value() !== valueOf(schemaPath.password)) {
        return { kind: 'noCoincide', message: 'Las contraseñas no coinciden.' };
      }
      return null;
    });

    maxLength(schemaPath.telefono, 30, { message: 'El teléfono puede tener hasta 30 caracteres.' });
  });

  protected registrarse(event: Event) {
    event.preventDefault();
    this.mensajeError.set(null);
    //submit marca todos los campos como tocados y solo sigue si el form es valido
    submit(this.registroForm, async () => {
      const modelo = this.registroModel();
      const datos: RegisterBody = {
        nombre: modelo.nombre,
        email: modelo.email,
        password: modelo.password,
      };
      //telefono es opcional en la api, si quedo vacio no se manda
      if (modelo.telefono !== '') {
        datos.telefono = modelo.telefono;
      }

      try {
        //el registro deja la sesion iniciada como cliente, va a su pagina de inicio
        await firstValueFrom(this.#authService.register(datos));
        await this.#router.navigateByUrl('/productos');
      } catch (error) {
        this.mensajeError.set(mensajeDeError(error));
      }
    });
  }
}

export default RegistroPage;
