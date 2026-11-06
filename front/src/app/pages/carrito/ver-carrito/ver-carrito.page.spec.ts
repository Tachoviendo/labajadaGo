import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Carrito } from '../../../models/carrito.model';
import { CarritoService } from '../../../services/carrito.service';
import { VerCarritoPage } from './ver-carrito.page';

describe('VerCarritoPage', () => {
  let fixture: ComponentFixture<VerCarritoPage>;

  async function crear(carrito: Carrito) {
    await TestBed.configureTestingModule({
      imports: [VerCarritoPage],
      providers: [
        provideRouter([]),
        { provide: CarritoService, useValue: { obtener: () => Promise.resolve(carrito) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(VerCarritoPage);
    await fixture.whenStable();
  }

  const base = { id: 3, usuarioId: 3, fechaActualizacion: '2026-01-01T00:00:00.000Z' };

  it('muestra el estado vacío cuando no hay productos', async () => {
    await crear({ ...base, items: [], total: 0 });
    expect(fixture.nativeElement.textContent).toContain('Tu carrito está vacío.');
  });

  it('muestra los productos, el total y avisa si falta stock', async () => {
    await crear({
      ...base,
      total: 170,
      items: [
        {
          id: 1,
          cantidad: 2,
          subtotal: 170,
          producto: {
            id: 1, nombre: 'Coca Cola 500ml', descripcion: null, precio: 85,
            categoria: 'Bebidas', imagenUrl: null, stock: 1, activo: true,
          },
        },
      ],
    });
    const texto = fixture.nativeElement.textContent;
    expect(texto).toContain('Coca Cola 500ml');
    expect(texto).toContain('$170');
    expect(texto).toContain('Solo quedan 1');
  });
});
