import { DatePipe } from '@angular/common';
import { Component, inject, linkedSignal, resource, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { NgbAlert, NgbPagination } from '@ng-bootstrap/ng-bootstrap';
import { RouterLink } from '@angular/router';

import { Rol, Usuario } from '../../../../models/auth.model';
import { ActualizarAdminBody } from '../../../../models/usuario.model';
import { mensajeDeError } from '../../../../services/api-error';
import { AuthService } from '../../../../services/auth.service';
import { UsuariosService } from '../../../../services/usuarios.service';
import { ConfirmacionService } from '../../../../components/confirmacion/confirmacion.service';

const LIMITE = 10;

@Component({
  selector: 'app-usuarios-internos',
  imports: [RouterLink, DatePipe, FormField, NgbAlert, NgbPagination],
  templateUrl: './usuarios-internos.page.html',
  styleUrl: './usuarios-internos.page.css',
})
export class UsuariosInternosPage {
  readonly #usuariosService = inject(UsuariosService);
  readonly #authService = inject(AuthService);
  readonly #confirmacion = inject(ConfirmacionService);

  protected readonly limite = LIMITE;

  //el dueño no puede desactivarse ni darse de baja a si mismo desde aca
  protected readonly idPropio = this.#authService.usuarioActual?.id ?? null;

  protected readonly mensajeExito = signal<string | null>(null);
  protected readonly mensajeError = signal<string | null>(null);

  //filtro (signal forms). rol '' es "todos los roles"
  protected readonly filtroModel = signal<{ rol: Rol | '' }>({ rol: '' });
  protected readonly filtroForm = form(this.filtroModel);

  //al cambiar el filtro se vuelve a la pagina 1
  protected readonly pagina = linkedSignal({
    source: () => this.filtroModel().rol,
    computation: () => 1,
  });

  //filtrado y paginacion en la api: se vuelve a pedir cuando cambia el rol o la pagina
  protected readonly usuarios = resource({
    params: () => ({ rol: this.filtroModel().rol || undefined, page: this.pagina(), limit: LIMITE }),
    loader: ({ params }) => this.#usuariosService.listar(params),
  });

  //la api anonimiza a los dados de baja con un email @labajada.invalid (ver users.service.js)
  protected estaEliminado(usuario: Usuario) {
    return usuario.email.endsWith('@labajada.invalid');
  }

  protected cambiarRol(usuario: Usuario, event: Event) {
    const select = event.target as HTMLSelectElement;
    const rol = select.value as 'cajero' | 'dueno';
    this.actualizarAdmin(usuario, { rol }, `Ahora ${usuario.nombre} es ${rol}.`);
  }

  protected async cambiarActivo(usuario: Usuario) {
    if (usuario.activo) {
      const confirmado = await this.#confirmacion.confirmar({
        titulo: 'Desactivar usuario',
        mensaje: `¿Desactivar a ${usuario.nombre}? No va a poder iniciar sesión.`,
        textoConfirmar: 'Desactivar',
        peligro: true,
      });
      if (!confirmado) {
        return;
      }
    }
    const mensaje = usuario.activo ? 'desactivado' : 'activado';
    this.actualizarAdmin(usuario, { activo: !usuario.activo }, `${usuario.nombre} fue ${mensaje}.`);
  }

  //ley 18331: borra los datos personales; los pedidos se conservan
  protected async darDeBaja(usuario: Usuario) {
    const confirmado = await this.#confirmacion.confirmar({
      titulo: 'Dar de baja',
      mensaje: `¿Dar de baja a ${usuario.nombre}? Se borran sus datos personales y no se puede deshacer.`,
      textoConfirmar: 'Dar de baja',
      peligro: true,
    });
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