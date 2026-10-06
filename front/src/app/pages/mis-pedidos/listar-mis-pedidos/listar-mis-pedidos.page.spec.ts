import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListarMisPedidosPage } from './listar-mis-pedidos.page';

describe('ListarMisPedidosPage', () => {
  let component: ListarMisPedidosPage;
  let fixture: ComponentFixture<ListarMisPedidosPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListarMisPedidosPage],
    }).compileComponents();

    fixture = TestBed.createComponent(ListarMisPedidosPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
