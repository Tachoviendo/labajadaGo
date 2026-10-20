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
} from '@angular/forms/signals';

import { CrearUsuarioInternoBody } from '../../../../models/usuario.model';
import { mensajeDeError } from '../../../../services/api-error';
import { UsuariosService } from '../../../../services/usuarios.service';

@Component({
  selector: 'app-alta-usuario',
  imports: [FormField, RouterLink],
  templateUrl: './alta-usuario.page.html',
  styleUrl: './alta-usuario.page.css',
})
export class AltaUsuarioPage {
  readonly #usuariosService = inject(UsuariosService);
  readonly #router = inject(Router);

  //mensaje de la api cuando el alta falla (ej: email repetido)
  protected readonly errorApi = signal<string | null>(null);

  protected readonly usuarioModel = signal({
    nombre: '',
    email: '',
    password: '',
    telefono: '',
    rol: 'cajero' as CrearUsuarioInternoBody['rol'],
  });

  //mismas reglas que CreateInternalUserBody en la api
  protected readonly usuarioForm = form(this.usuarioModel, (schemaPath) => {
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

    maxLength(schemaPath.telefono, 30, { message: 'El teléfono puede tener hasta 30 caracteres.' });

    required(schemaPath.rol, { message: 'Elegí un rol.' });
  });

  protected submitForm(event: Event) {
    event.preventDefault();
    this.errorApi.set(null);
    //submit marca todos los campos como tocados y solo sigue si el form es valido
    submit(this.usuarioForm, async () => {
      const modelo = this.usuarioModel();
      const datos: CrearUsuarioInternoBody = {
        nombre: modelo.nombre,
        email: modelo.email,
        password: modelo.password,
        rol: modelo.rol,
      };
      //telefono es opcional en la api, si quedo vacio no se manda
      if (modelo.telefono !== '') {
        datos.telefono = modelo.telefono;
      }

      try {
        await this.#usuariosService.crear(datos);
        this.#router.navigate(['/admin/usuarios']);
      } catch (error) {
        this.errorApi.set(mensajeDeError(error));
      }
    });
  }
}

export default AltaUsuarioPage;