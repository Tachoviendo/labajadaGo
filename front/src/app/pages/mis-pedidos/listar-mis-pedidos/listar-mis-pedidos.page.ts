import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, resource, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonBadge,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonIcon,
  IonItem,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonText,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chevronBackOutline, chevronForwardOutline, receiptOutline } from 'ionicons/icons';

import { EstadoPedido, ESTADOS_PEDIDO, METODOS_PAGO } from '../../../models/pedido.model';
import { mensajeDeError } from '../../../services/api-error';
import { PedidosService } from '../../../services/pedidos.service';

//pedidos por pagina. la api no devuelve el total, asi que hay siguiente si vino la pagina llena
const POR_PAGINA = 10;

@Component({
  selector: 'app-listar-mis-pedidos',
  imports: [
    CurrencyPipe,
    DatePipe,
    RouterLink,
    IonBadge,
    IonButton,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardSubtitle,
    IonCardTitle,
    IonIcon,
    IonItem,
    IonSelect,
    IonSelectOption,
    IonSpinner,
    IonText,
  ],
  templateUrl: './listar-mis-pedidos.page.html',
  styleUrl: './listar-mis-pedidos.page.css',
})
export class ListarMisPedidosPage {
  readonly #pedidosService = inject(PedidosService);

  protected readonly estados = ESTADOS_PEDIDO;
  protected readonly metodosPago = METODOS_PAGO;
  protected readonly porPagina = POR_PAGINA;

  //'' es "todos los estados"
  protected readonly filtroEstado = signal<EstadoPedido | ''>('');
  protected readonly pagina = signal(1);

  //se vuelve a pedir cuando cambia el filtro o la pagina
  protected readonly pedidos = resource({
    params: () => ({
      estado: this.filtroEstado() || undefined,
      page: this.pagina(),
      limit: POR_PAGINA,
    }),
    loader: ({ params }) => this.#pedidosService.listar(params),
  });

  constructor() {
    addIcons({ chevronBackOutline, chevronForwardOutline, receiptOutline });
  }

  protected cambiarFiltro(event: CustomEvent) {
    this.filtroEstado.set(event.detail.value);
    //al cambiar el filtro se vuelve a la primera pagina
    this.pagina.set(1);
  }

  protected irAPagina(pagina: number) {
    this.pagina.set(pagina);
  }

  protected mensajeDeError(error: unknown) {
    return mensajeDeError(error);
  }
}

export default ListarMisPedidosPage;
