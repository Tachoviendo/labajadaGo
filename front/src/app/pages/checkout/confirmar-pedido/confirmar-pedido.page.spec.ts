import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Carrito } from '../../../models/carrito.model';
import { Direccion } from '../../../models/direccion.model';
import { CarritoService } from '../../../services/carrito.service';
import { DireccionesService } from '../../../services/direcciones.service';
import { PedidosService } from '../../../services/pedidos.service';
import { ConfirmarPedidoPage } from './confirmar-pedido.page';

describe('ConfirmarPedidoPage', () => {
  let fixture: ComponentFixture<ConfirmarPedidoPage>;

  const carrito: Carrito = {
    id: 3,
    usuarioId: 3,
    fechaActualizacion: '2026-01-01T00:00:00.000Z',
    total: 90,
    items: [
      {
        id: 3,
        cantidad: 1,
        subtotal: 90,
        producto: {
          id: 3, nombre: 'Papas Lays', descripcion: null, precio: 90,
          categoria: 'Snacks', imagenUrl: null, stock: 30, activo: true,
        },
      },
    ],
  };

  async function crear(direcciones: Direccion[]) {
    await TestBed.configureTestingModule({
      imports: [ConfirmarPedidoPage],
      providers: [
        provideRouter([]),
        { provide: CarritoService, useValue: { obtener: () => Promise.resolve(carrito) } },
        { provide: DireccionesService, useValue: { listar: () => Promise.resolve(direcciones) } },
        { provide: PedidosService, useValue: {} },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmarPedidoPage);
    await fixture.whenStable();
  }

  it('muestra el resumen y las direcciones para elegir', async () => {
    await crear([
      {
        id: 1, usuarioId: 3, calle: '18 de Julio', numero: '1234',
        ciudad: 'Bella Union', referencia: null, esPredeterminada: false,
      },
    ]);
    const texto = fixture.nativeElement.textContent;
    expect(texto).toContain('Papas Lays');
    expect(texto).toContain('18 de Julio 1234');
    expect(texto).toContain('Confirmar pedido');
  });

  it('pide agregar una dirección si el cliente no tiene ninguna', async () => {
    await crear([]);
    expect(fixture.nativeElement.textContent).toContain('Necesitás una dirección');
  });
});
