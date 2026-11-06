import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { DireccionesService } from '../../../services/direcciones.service';
import { MisDireccionesPage } from './mis-direcciones.page';

describe('MisDireccionesPage', () => {
  let fixture: ComponentFixture<MisDireccionesPage>;

  beforeEach(async () => {
    const direcciones = [
      {
        id: 1, usuarioId: 3, calle: 'Rivera', numero: '89',
        ciudad: 'Bella Union', referencia: 'Al lado de la plaza', esPredeterminada: false,
      },
    ];
    await TestBed.configureTestingModule({
      imports: [MisDireccionesPage],
      providers: [
        provideRouter([]),
        { provide: DireccionesService, useValue: { listar: () => Promise.resolve(direcciones) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MisDireccionesPage);
    await fixture.whenStable();
  });

  it('lista las direcciones del cliente', () => {
    const texto = fixture.nativeElement.textContent;
    expect(texto).toContain('Rivera 89');
    expect(texto).toContain('Al lado de la plaza');
    expect(texto).toContain('Agregar dirección');
  });
});
