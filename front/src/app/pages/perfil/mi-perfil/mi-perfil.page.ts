import { Component, inject, linkedSignal, resource, signal } from '@angular/core';
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

import { mensajeDeError } from '../../../services/api-error';
import { AuthService } from '../../../services/auth.service';
import { UsuariosService } from '../../../services/usuarios.service';

@Component({
  selector: 'app-mi-perfil',
  imports: [FormField, RouterLink],
  templateUrl: './mi-perfil.page.html',
  styleUrl: './mi-perfil.page.css',
})
export class MiPerfilPage {
  readonly #usuariosService = inject(UsuariosService);
  readonly #authService = inject(AuthService);
  readonly #router = inject(Router);

  //id del usuario logueado, null si no hay sesion
  protected readonly idUsuario = this.#authService.usuarioActual?.id ?? null;

  protected readonly mensajeExito = signal<string | null>(null);
  protected readonly mensajeError = signal<string | null>(null);

  //datos actuales traidos de la api
  protected readonly perfil = resource({
    params: () => this.idUsuario ?? undefined,
    loader: ({ params }) => this.#usuariosService.obtener(params),
  });

  //linkedSignal: se carga con los datos de la api y a la vez se puede editar
  protected readonly perfilModel = linkedSignal(() => {
    const usuario = this.perfil.hasValue() ? this.perfil.value() : null;
    return {
      nombre: usuario?.nombre ?? '',
      email: usuario?.email ?? '',
      telefono: usuario?.telefono ?? '',
    };
  });

  //mismas reglas que UserUpdateBody en la api (rol y activo no se editan aca)
  protected readonly perfilForm = form(this.perfilModel, (schemaPath) => {
    required(schemaPath.nombre, { message: 'El nombre es obligatorio.' });
    minLength(schemaPath.nombre, 2, { message: 'El nombre debe tener al menos 2 caracteres.' });
    maxLength(schemaPath.nombre, 100, { message: 'El nombre puede tener hasta 100 caracteres.' });
    required(schemaPath.email, { message: 'El email es obligatorio.' });
    email(schemaPath.email, { message: 'El email no tiene un formato válido.' });
    maxLength(schemaPath.email, 150, { message: 'El email puede tener hasta 150 caracteres.' });
    maxLength(schemaPath.telefono, 30, { message: 'El teléfono puede tener hasta 30 caracteres.' });
  });

  protected readonly passwordModel = signal({
    passwordActual: '',
    passwordNueva: '',
    confirmacion: '',
  });

  //mismas reglas que PasswordChangeBody en la api, mas la confirmacion
  protected readonly passwordForm = form(this.passwordModel, (schemaPath) => {
    required(schemaPath.passwordActual, { message: 'Ingresá tu contraseña actual.' });
    required(schemaPath.passwordNueva, { message: 'Ingresá la contraseña nueva.' });
    minLength(schemaPath.passwordNueva, 8, {
      message: 'La contraseña nueva debe tener al menos 8 caracteres.',
    });
    maxLength(schemaPath.passwordNueva, 72, {
      message: 'La contraseña nueva puede tener hasta 72 caracteres.',
    });
    validate(schemaPath.confirmacion, ({ value, valueOf }) => {
      if (value() !== valueOf(schemaPath.passwordNueva)) {
        return { kind: 'noCoincide', message: 'Las contraseñas no coinciden.' };
      }
      return null;
    });
  });

  protected guardarPerfil(event: Event) {
    event.preventDefault();
    this.limpiarMensajes();
    submit(this.perfilForm, async () => {
      if (this.idUsuario === null) return;
      try {
        await this.#usuariosService.actualizar(this.idUsuario, this.perfilModel());
        this.perfil.reload();
        this.mensajeExito.set('Tus datos se guardaron.');
      } catch (error) {
        this.mensajeError.set(mensajeDeError(error));
      }
    });
  }

  protected cambiarPassword(event: Event) {
    event.preventDefault();
    this.limpiarMensajes();
    submit(this.passwordForm, async () => {
      const { passwordActual, passwordNueva } = this.passwordModel();
      try {
        await this.#usuariosService.cambiarPassword({ passwordActual, passwordNueva });
        this.passwordModel.set({ passwordActual: '', passwordNueva: '', confirmacion: '' });
        this.passwordForm().reset();
        this.mensajeExito.set('Tu contraseña se cambió.');
      } catch (error) {
        this.mensajeError.set(mensajeDeError(error));
      }
    });
  }

  //ley 18331: borra los datos personales; los pedidos se conservan
  protected async darDeBaja() {
    if (this.idUsuario === null) return;
    const confirmado = confirm(
      '¿Seguro que querés dar de baja tu cuenta? Se borran tus datos personales y no se puede deshacer.',
    );
    if (!confirmado) return;

    this.limpiarMensajes();
    try {
      await this.#usuariosService.eliminar(this.idUsuario);
      this.#authService.logout().subscribe({ error: () => {} });
      alert('Tu cuenta fue dada de baja.');
      this.#router.navigate(['/']);
    } catch (error) {
      this.mensajeError.set(mensajeDeError(error));
    }
  }

  private limpiarMensajes() {
    this.mensajeExito.set(null);
    this.mensajeError.set(null);
  }

  protected mensajeDeError(error: unknown) {
    return mensajeDeError(error);
  }
}

export default MiPerfilPage;