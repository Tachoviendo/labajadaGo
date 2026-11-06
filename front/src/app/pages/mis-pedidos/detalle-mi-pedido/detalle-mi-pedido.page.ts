import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, resource, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  AlertController,
  IonBadge,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonSpinner,
  IonText,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  checkmarkCircle,
  chevronBackOutline,
  ellipseOutline,
  locationOutline,
  walletOutline,
} from 'ionicons/icons';

import {
  ESTADOS_CANCELABLES,
  ESTADOS_PEDIDO,
  METODOS_PAGO,
  ORDEN_ESTADOS,
  Pedido,
} from '../../../models/pedido.model';
import { mensajeDeError } from '../../../services/api-error';
import { PedidosService } from '../../../services/pedidos.service';

@Component({
  selector: 'app-detalle-mi-pedido',
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
    IonLabel,
    IonList,
    IonNote,
    IonSpinner,
    IonText,
  ],
  templateUrl: './detalle-mi-pedido.page.html',
  styleUrl: './detalle-mi-pedido.page.css',
})
export class DetalleMiPedidoPage {
  readonly #pedidosService = inject(PedidosService);
  readonly #alertController = inject(AlertController);
  readonly #route = inject(ActivatedRoute);

  protected readonly estados = ESTADOS_PEDIDO;
  protected readonly metodosPago = METODOS_PAGO;
  protected readonly ordenEstados = ORDEN_ESTADOS;

  readonly #id = Number(this.#route.snapshot.paramMap.get('id'));

  //viene del checkout recien confirmado
  protected readonly esNuevo = this.#route.snapshot.queryParamMap.has('nuevo');

  protected readonly pedido = resource({
    loader: () => this.#pedidosService.obtener(this.#id),
  });

  protected readonly cancelando = signal(false);
  protected readonly mensajeError = signal<string | null>(null);
  protected readonly mensajeExito = signal<string | null>(null);

  constructor() {
    addIcons({ checkmarkCircle, chevronBackOutline, ellipseOutline, locationOutline, walletOutline });
  }

  protected sePuedeCancelar(pedido: Pedido) {
    return ESTADOS_CANCELABLES.includes(pedido.estado);
  }

  //un paso del seguimiento esta hecho si el pedido ya llego a ese estado
  protected pasoCompletado(pedido: Pedido, indice: number) {
    return ORDEN_ESTADOS.indexOf(pedido.estado) >= indice;
  }

  protected async cancelar(pedido: Pedido) {
    const alerta = await this.#alertController.create({
      header: '¿Cancelar el pedido?',
      message: `Se cancela el pedido #${pedido.id} y no se puede deshacer.`,
      buttons: [
        { text: 'Volver', role: 'cancel' },
        { text: 'Cancelar pedido', role: 'confirm' },
      ],
    });
    await alerta.present();
    const { role } = await alerta.onDidDismiss();
    if (role !== 'confirm') return;

    this.mensajeError.set(null);
    this.cancelando.set(true);
    try {
      await this.#pedidosService.cancelar(pedido.id);
      this.mensajeExito.set('El pedido se canceló.');
      this.pedido.reload();
    } catch (error) {
      this.mensajeError.set(mensajeDeError(error));
    } finally {
      this.cancelando.set(false);
    }
  }

  protected mensajeDeError(error: unknown) {
    return mensajeDeError(error);
  }
}

export default DetalleMiPedidoPage;
