import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, resource, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgbAlert } from '@ng-bootstrap/ng-bootstrap';
import { firstValueFrom } from 'rxjs';

import { mensajeDeError } from '../../../services/api-error';
import { OrdersService, Pedido } from '../../../services/orders.service';
import { RepartosService } from '../../../services/repartos.service';

//inicio del repartidor: si esta llevando un pedido, el acceso directo a ese reparto;
//si no, los pedidos listos para recoger
@Component({
  selector: 'app-disponibles',
  imports: [RouterLink, CurrencyPipe, DatePipe, NgbAlert],
  templateUrl: './disponibles.page.html',
  styleUrl: './disponibles.page.css',
})
export class DisponiblesPage {
  readonly #ordersService = inject(OrdersService);
  readonly #repartosService = inject(RepartosService);
  readonly #router = inject(Router);

  //el repartidor lleva un pedido a la vez (la api no le deja recoger otro)
  protected readonly enCurso = resource({
    loader: () => firstValueFrom(this.#ordersService.listar({ estado: 'en_reparto', limit: 1 })),
  });
  protected readonly actual = computed(() => (this.enCurso.hasValue() ? this.enCurso.value()[0] : undefined));

  //pedidos en preparando sin repartidor, del mas viejo al mas nuevo
  protected readonly disponibles = resource({
    loader: () => firstValueFrom(this.#repartosService.disponibles()),
  });

  protected readonly recogiendo = signal<number | null>(null);
  protected readonly mensajeError = signal<string | null>(null);

  //recoger lo asigna y lo saca a reparto; despues se va directo a la pantalla del reparto
  protected async recoger(pedido: Pedido) {
    if (this.recogiendo() !== null) return;
    this.recogiendo.set(pedido.id);
    this.mensajeError.set(null);
    try {
      await firstValueFrom(this.#repartosService.recoger(pedido.id));
      await this.#router.navigate(['/repartos', pedido.id]);
    } catch (error) {
      //409: otro repartidor lo tomo antes o ya tenes uno en reparto
      this.mensajeError.set(`Pedido #${pedido.id}: ${mensajeDeError(error)}`);
      this.disponibles.reload();
      this.enCurso.reload();
    } finally {
      this.recogiendo.set(null);
    }
  }

  protected actualizar() {
    this.disponibles.reload();
    this.enCurso.reload();
  }

  protected mensajeDeError(error: unknown) {
    return mensajeDeError(error);
  }
}

export default DisponiblesPage;
