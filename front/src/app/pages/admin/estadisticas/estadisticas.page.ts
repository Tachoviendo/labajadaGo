import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, resource, signal } from '@angular/core';
import { FormField, form, required, validate } from '@angular/forms/signals';
import { NgbProgressbar } from '@ng-bootstrap/ng-bootstrap';
import { firstValueFrom } from 'rxjs';

import { EstadoPedidoComponent } from '../../../components/estado-pedido/estado-pedido.component';
import { mensajeDeError } from '../../../services/api-error';
import { FiltrosResumen, OrdersService } from '../../../services/orders.service';

type Periodo = 'hoy' | 'semana' | 'mes' | 'todo' | 'rango';

//fecha local en YYYY-MM-DD (toISOString la pasaria a UTC y de noche cambia el dia)
function aFecha(fecha: Date): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

function haceDias(dias: number): string {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() - dias);
  return aFecha(fecha);
}

function inicioDelMes(): string {
  const ahora = new Date();
  return aFecha(new Date(ahora.getFullYear(), ahora.getMonth(), 1));
}

//estadisticas de ventas del dueño (HU-25), con GET /pedidos/resumen
@Component({
  selector: 'app-estadisticas',
  imports: [CurrencyPipe, FormField, NgbProgressbar, EstadoPedidoComponent],
  templateUrl: './estadisticas.page.html',
  styleUrl: './estadisticas.page.css',
})
export class EstadisticasPage {
  readonly #ordersService = inject(OrdersService);

  protected readonly periodos: { valor: Periodo; nombre: string }[] = [
    { valor: 'hoy', nombre: 'Hoy' },
    { valor: 'semana', nombre: 'Últimos 7 días' },
    { valor: 'mes', nombre: 'Este mes' },
    { valor: 'todo', nombre: 'Todo' },
    { valor: 'rango', nombre: 'Elegir fechas' },
  ];
  protected readonly periodo = signal<Periodo>('hoy');

  //rango a mano: solo se usa con periodo 'rango'
  protected readonly rango = signal({ desde: haceDias(30), hasta: aFecha(new Date()) });
  protected readonly rangoForm = form(this.rango, (campo) => {
    required(campo.desde, { message: 'Elegí la fecha de inicio.' });
    required(campo.hasta, { message: 'Elegí la fecha de fin.' });
    validate(campo.hasta, ({ value, valueOf }) =>
      value() && valueOf(campo.desde) > value()
        ? { kind: 'rango', message: 'Tiene que ser igual o posterior a "desde".' }
        : undefined,
    );
  });

  //lo que se manda a la api segun el periodo elegido
  readonly #criterios = computed<FiltrosResumen | undefined>(() => {
    const hoy = aFecha(new Date());
    switch (this.periodo()) {
      case 'hoy':
        return { fechaDesde: hoy, fechaHasta: hoy, top: 10 };
      case 'semana':
        return { fechaDesde: haceDias(6), fechaHasta: hoy, top: 10 };
      case 'mes':
        return { fechaDesde: inicioDelMes(), fechaHasta: hoy, top: 10 };
      case 'todo':
        return { top: 10 };
      case 'rango':
        //con el rango invalido no se pide nada (params undefined = el resource no carga)
        if (this.rangoForm().invalid()) return undefined;
        return { fechaDesde: this.rango().desde, fechaHasta: this.rango().hasta, top: 10 };
    }
  });

  protected readonly resumen = resource({
    params: () => this.#criterios(),
    loader: ({ params }) => firstValueFrom(this.#ordersService.resumen(params)),
  });

  //para las barras: cada estado sobre el total de pedidos del periodo (incluye cancelados)
  protected readonly totalPorEstado = computed(() => {
    if (!this.resumen.hasValue()) return 0;
    return this.resumen.value().porEstado.reduce((suma, e) => suma + e.cantidad, 0);
  });

  //la barra del producto mas vendido llena y el resto en proporcion
  protected readonly maxVendido = computed(() => {
    if (!this.resumen.hasValue()) return 0;
    return Math.max(0, ...this.resumen.value().masVendidos.map((p) => p.cantidad));
  });

  protected mensajeDeError(error: unknown) {
    return mensajeDeError(error);
  }
}

export default EstadisticasPage;
