import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Pedido } from '../../../models/pedido.model';
import { PedidosService } from '../../../services/pedidos.service';
import { ListarMisPedidosPage } from './listar-mis-pedidos.page';

describe('ListarMisPedidosPage', () => {
  let fixture: ComponentFixture<ListarMisPedidosPage>;

  async function crear(pedidos: Pedido[]) {
    await TestBed.configureTestingModule({
      imports: [ListarMisPedidosPage],
      providers: [
        provideRouter([]),
        { provide: PedidosService, useValue: { listar: () => Promise.resolve(pedidos) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ListarMisPedidosPage);
    await fixture.whenStable();
  }

  it('muestra cada pedido con su estado y total', async () => {
    await crear([
      {
        id: 5,
        usuarioId: 3,
        direccion: {
          id: 1, usuarioId: 3, calle: 'Rivera', numero: '89',
          ciudad: 'Bella Union', referencia: null, esPredeterminada: false,
        },
        items: [
          { id: 1, productoId: 1, nombreProducto: 'Yerba', cantidad: 1, precioUnitario: 290, subtotal: 290 },
        ],
        estado: 'en_reparto',
        metodoPago: 'pos',
        total: 290,
        fechaCreacion: '2026-01-02T03:04:05.000Z',
      },
    ]);
    const texto = fixture.nativeElement.textContent;
    expect(texto).toContain('Pedido #5');
    expect(texto).toContain('En reparto');
    expect(texto).toContain('$290');
  });

  it('muestra el estado vacío si el cliente no tiene pedidos', async () => {
    await crear([]);
    expect(fixture.nativeElement.textContent).toContain('Todavía no hiciste ningún pedido.');
  });
});
