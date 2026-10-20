import { DatePipe } from '@angular/common';
import { Component, inject, resource, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Rol } from '../../../../models/auth.model';
import { mensajeDeError } from '../../../../services/api-error';
import { UsuariosService } from '../../../../services/usuarios.service';

@Component({
  selector: 'app-usuarios-internos',
  imports: [RouterLink, DatePipe],
  templateUrl: './usuarios-internos.page.html',
  styleUrl: './usuarios-internos.page.css',
})
export class UsuariosInternosPage {
  readonly #usuariosService = inject(UsuariosService);

  //'' es "todos los roles"
  protected readonly filtroRol = signal<Rol | ''>('');

  //se vuelve a pedir solo cuando cambia el filtro
  protected readonly usuarios = resource({
    params: () => ({ rol: this.filtroRol() || undefined }),
    loader: ({ params }) => this.#usuariosService.listar(params),
  });

  protected cambiarFiltro(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.filtroRol.set(select.value as Rol | '');
  }

  protected mensajeDeError(error: unknown) {
    return mensajeDeError(error);
  }
}

export default UsuariosInternosPage;