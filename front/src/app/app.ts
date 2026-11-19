import { Component, inject, signal } from '@angular/core';
import {
  NgbCollapse,
  NgbDropdown,
  NgbDropdownItem,
  NgbDropdownMenu,
  NgbDropdownToggle,
} from '@ng-bootstrap/ng-bootstrap';
import { Router, RouterLink, RouterOutlet, RouterLinkActive } from '@angular/router';

import { ToastsComponent } from './components/toasts/toasts.component';
import { AuthService } from './services/auth.service';

@Component({
  imports: [
    RouterLink,
    RouterOutlet,
    RouterLinkActive,
    NgbCollapse,
    NgbDropdown,
    NgbDropdownToggle,
    NgbDropdownMenu,
    NgbDropdownItem,
    ToastsComponent,
  ],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  readonly #authService = inject(AuthService);
  readonly #router = inject(Router);

  //usuario logueado, null si no hay sesion
  protected readonly usuario = this.#authService.usuario;

  //menu colapsable en pantallas chicas (visitante y personal)
  protected readonly menuColapsado = signal(true);

  //al tocar un link del menu se cierra
  protected cerrarMenu() {
    this.menuColapsado.set(true);
  }

  //el estado local se limpia aunque la api falle, por eso se ignora el error
  protected cerrarSesion() {
    this.#authService.logout().subscribe({ error: () => {} });
    this.#router.navigate(['/login']);
  }
}
