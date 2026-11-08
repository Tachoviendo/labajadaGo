import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { email, form, FormField, required, submit } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';

import { Rol } from '../../../models/auth.model';
import { mensajeDeError } from '../../../services/api-error';
import { AuthService } from '../../../services/auth.service';

//a donde va cada rol despues de loguearse (ver docs/mapa-navegacion.drawio)
const INICIO_POR_ROL: Record<Rol, string> = {
  cliente: '/productos',
  cajero: '/admin/pedidos',
  dueno: '/admin',
};

@Component({
  selector: 'app-login',
  imports: [FormField, RouterLink],
  templateUrl: './login.page.html',
  styleUrl: './login.page.css',
})
export class LoginPage {
  readonly #authService = inject(AuthService);
  readonly #router = inject(Router);
  readonly #route = inject(ActivatedRoute);

  protected readonly mensajeError = signal<string | null>(null);

  protected readonly loginModel = signal({ email: '', password: '' });

  //mismas reglas que LoginBody en la api
  protected readonly loginForm = form(this.loginModel, (schemaPath) => {
    required(schemaPath.email, { message: 'El email es obligatorio.' });
    email(schemaPath.email, { message: 'El email no tiene un formato válido.' });
    required(schemaPath.password, { message: 'La contraseña es obligatoria.' });
  });

  protected iniciarSesion(event: Event) {
    event.preventDefault();
    this.mensajeError.set(null);
    submit(this.loginForm, async () => {
      try {
        const { usuario } = await firstValueFrom(this.#authService.login(this.loginModel()));
        //si un guard nos mando al login, volvemos a la pagina que se queria ver
        const returnUrl = this.#route.snapshot.queryParamMap.get('returnUrl');
        await this.#router.navigateByUrl(
          returnUrl?.startsWith('/') ? returnUrl : INICIO_POR_ROL[usuario.rol],
        );
      } catch (error) {
        this.mensajeError.set(mensajeDeError(error));
      }
    });
  }
}

export default LoginPage;
