import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterOutlet } from '@angular/router';

import { AuthService } from './services/auth.service';

@Component({
  imports: [RouterLink, RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  readonly #authService = inject(AuthService);
  readonly #router = inject(Router);

  //usuario logueado, null si no hay sesion
  protected readonly usuario = toSignal(this.#authService.usuario$, { initialValue: null });

  //el estado local se limpia aunque la api falle, por eso se ignora el error
  protected cerrarSesion() {
    this.#authService.logout().subscribe({ error: () => {} });
    this.#router.navigate(['/login']);
  }
}
