import { DatePipe } from '@angular/common';
import { Component, inject, resource, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Rol, Usuario } from '../../../../models/auth.model';
import { ActualizarAdminBody } from '../../../../models/usuario.model';
import { mensajeDeError } from '../../../../services/api-error';
import { AuthService } from '../../../../services/auth.service';
import { UsuariosService } from '../../../../services/usuarios.service';

@Component({
  selector: 'app-usuarios-internos',
  imports: [RouterLink, DatePipe],
  templateUrl: './usuarios-internos.page.html',
  styleUrl: './usuarios-internos.page.css',
})
export class UsuariosInternosPage {
  readonly #usuariosService = inject(UsuariosService);
  readonly #authService = inject(AuthService);

  //el dueño no puede desactivarse ni darse de baja a si mismo desde aca
  protected readonly idPropio = this.#authService.usuarioActual?.id ?? null;

  protected readonly mensajeExito = signal<string | null>(null);
  protected readonly mensajeError = signal<string | null>(null);

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

  //la api anonimiza a los dados de baja con un email @labajada.invalid (ver users.service.js)
  protected estaEliminado(usuario: Usuario) {
    return usuario.email.endsWith('@labajada.invalid');
  }

  protected cambiarRol(usuario: Usuario, event: Event) {
    const select = event.target as HTMLSelectElement;
    const rol = select.value as 'cajero' | 'dueno';
    this.actualizarAdmin(usuario, { rol }, `Ahora ${usuario.nombre} es ${rol}.`);
  }

  protected cambiarActivo(usuario: Usuario) {
    if (usuario.activo && !confirm(`¿Desactivar a ${usuario.nombre}? No va a poder iniciar sesión.`)) {
      return;
    }
    const mensaje = usuario.activo ? 'desactivado' : 'activado';
    this.actualizarAdmin(usuario, { activo: !usuario.activo }, `${usuario.nombre} fue ${mensaje}.`);
  }

  //ley 18331: borra los datos personales; los pedidos se conservan
  protected async darDeBaja(usuario: Usuario) {
    const confirmado = confirm(
      `¿Dar de baja a ${usuario.nombre}? Se borran sus datos personales y no se puede deshacer.`,
    );
    if (!confirmado) return;

    this.limpiarMensajes();
    try {
      await this.#usuariosService.eliminar(usuario.id);
      this.mensajeExito.set(`${usuario.nombre} fue dado de baja.`);
      this.usuarios.reload();
    } catch (error) {
      this.mensajeError.set(mensajeDeError(error));
    }
  }

  private async actualizarAdmin(usuario: Usuario, datos: ActualizarAdminBody, exito: string) {
    this.limpiarMensajes();
    try {
      await this.#usuariosService.actualizarAdmin(usuario.id, datos);
      this.mensajeExito.set(exito);
    } catch (error) {
      this.mensajeError.set(mensajeDeError(error));
    }
    //se recarga siempre: si fallo, el select vuelve al valor real
    this.usuarios.reload();
  }

  private limpiarMensajes() {
    this.mensajeExito.set(null);
    this.mensajeError.set(null);
  }

  protected mensajeDeError(error: unknown) {
    return mensajeDeError(error);
  }
}

export default UsuariosInternosPage;