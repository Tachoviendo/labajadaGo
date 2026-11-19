import { DatePipe } from '@angular/common';
import { Component, inject, linkedSignal, resource, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgbAlert, NgbPagination } from '@ng-bootstrap/ng-bootstrap';

import { Rol, Usuario } from '../../../../models/auth.model';
import { ActualizarAdminBody, RolInterno } from '../../../../models/usuario.model';
import { mensajeDeError } from '../../../../services/api-error';
import { AuthService } from '../../../../services/auth.service';
import { ConfirmacionService } from '../../../../services/confirmacion.service';
import { UsuariosService } from '../../../../services/usuarios.service';

@Component({
  selector: 'app-usuarios-internos',
  imports: [RouterLink, DatePipe, NgbAlert, NgbPagination],
  templateUrl: './usuarios-internos.page.html',
  styleUrl: './usuarios-internos.page.css',
})
export class UsuariosInternosPage {
  readonly #usuariosService = inject(UsuariosService);
  readonly #authService = inject(AuthService);
  readonly #confirmacion = inject(ConfirmacionService);

  //el dueño no puede desactivarse ni darse de baja a si mismo desde aca
  protected readonly idPropio = this.#authService.usuarioActual?.id ?? null;

  protected readonly mensajeExito = signal<string | null>(null);
  protected readonly mensajeError = signal<string | null>(null);

  //'' es "todos los roles"
  protected readonly filtroRol = signal<Rol | ''>('');

  protected readonly porPagina = 10;

  //vuelve a la pagina 1 cuando cambia el filtro; NgbPagination la setea a mano
  protected readonly pagina = linkedSignal(() => {
    this.filtroRol();
    return 1;
  });

  //se vuelve a pedir cuando cambia el filtro o la pagina
  protected readonly usuarios = resource({
    params: () => ({ rol: this.filtroRol() || undefined, page: this.pagina(), limit: this.porPagina }),
    loader: ({ params }) => this.#usuariosService.listar(params),
  });

  protected readonly roles: { valor: Rol | ''; nombre: string }[] = [
    { valor: '', nombre: 'Todos' },
    { valor: 'cliente', nombre: 'Clientes' },
    { valor: 'cajero', nombre: 'Cajeros' },
    { valor: 'dueno', nombre: 'Dueños' },
    { valor: 'repartidor', nombre: 'Repartidores' },
  ];

  //el valor de la api va sin ñ ('dueno'); esto es solo para mostrar
  protected nombreRol(rol: Rol) {
    const nombres: Record<Rol, string> = {
      cliente: 'Cliente',
      cajero: 'Cajero',
      dueno: 'Dueño',
      repartidor: 'Repartidor',
    };
    return nombres[rol];
  }

  protected cambiarFiltro(rol: Rol | '') {
    this.filtroRol.set(rol);
  }

  protected iniciales(usuario: Usuario) {
    return usuario.nombre
      .split(' ')
      .slice(0, 2)
      .map((parte) => parte[0]?.toUpperCase() ?? '')
      .join('');
  }

  //la api anonimiza a los dados de baja con un email @labajada.invalid (ver users.service.js)
  protected estaEliminado(usuario: Usuario) {
    return usuario.email.endsWith('@labajada.invalid');
  }

  protected cambiarRol(usuario: Usuario, event: Event) {
    const select = event.target as HTMLSelectElement;
    const rol = select.value as RolInterno;
    this.actualizarAdmin(usuario, { rol }, `Ahora ${usuario.nombre} es ${this.nombreRol(rol).toLowerCase()}.`);
  }

  protected async cambiarActivo(usuario: Usuario) {
    if (
      usuario.activo &&
      !(await this.#confirmacion.preguntar({
        titulo: `¿Desactivar a ${usuario.nombre}?`,
        mensaje: 'No va a poder iniciar sesión hasta que lo vuelvas a activar.',
        textoConfirmar: 'Desactivar',
        peligro: true,
      }))
    ) {
      return;
    }
    const mensaje = usuario.activo ? 'desactivado' : 'activado';
    this.actualizarAdmin(usuario, { activo: !usuario.activo }, `${usuario.nombre} fue ${mensaje}.`);
  }

  //ley 18331: borra los datos personales; los pedidos se conservan
  protected async darDeBaja(usuario: Usuario) {
    const confirmado = await this.#confirmacion.preguntar({
      titulo: `¿Dar de baja a ${usuario.nombre}?`,
      mensaje: 'Se borran sus datos personales y no se puede deshacer. Sus pedidos se conservan.',
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