import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { EstadoPedido, Pedido } from '../../../models/pedido.model';
import { PedidosService } from '../../../services/pedidos.service';
import { DetalleMiPedidoPage } from './detalle-mi-pedido.page';

describe('DetalleMiPedidoPage', () => {
  let fixture: ComponentFixture<DetalleMiPedidoPage>;

  function pedido(estado: EstadoPedido): Pedido {
    return {
      id: 7,
      usuarioId: 3,
      direccion: {
        id: 1, usuarioId: 3, calle: '18 de Julio', numero: '1234',
        ciudad: 'Bella Union', referencia: null, esPredeterminada: false,
      },
      items: [
        { id: 1, productoId: 1, nombreProducto: 'Coca Cola 500ml', cantidad: 2, precioUnitario: 85, subtotal: 170 },
      ],
      estado,
      metodoPago: 'pos',
      total: 170,
      fechaCreacion: '2026-01-02T03:04:05.000Z',
    };
  }

  async function crear(estado: EstadoPedido) {
    await TestBed.configureTestingModule({
      imports: [DetalleMiPedidoPage],
      providers: [
        provideRouter([]),
        { provide: PedidosService, useValue: { obtener: () => Promise.resolve(pedido(estado)) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DetalleMiPedidoPage);
    await fixture.whenStable();
  }

  it('muestra productos, dirección y permite cancelar un pedido recién hecho', async () => {
    await crear('realizado');
    const texto = fixture.nativeElement.textContent;
    expect(texto).toContain('Pedido #7');
    expect(texto).toContain('2 × Coca Cola 500ml');
    expect(texto).toContain('18 de Julio 1234');
    expect(texto).toContain('POS al recibir');
    expect(texto).toContain('Cancelar pedido');
  });

  it('no ofrece cancelar un pedido que ya salió a reparto', async () => {
    await crear('en_reparto');
    expect(fixture.nativeElement.textContent).not.toContain('Cancelar pedido');
  });
});
