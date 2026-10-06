import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DetalleMiPedidoPage } from './detalle-mi-pedido.page';

describe('DetalleMiPedidoPage', () => {
  let component: DetalleMiPedidoPage;
  let fixture: ComponentFixture<DetalleMiPedidoPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetalleMiPedidoPage],
    }).compileComponents();

    fixture = TestBed.createComponent(DetalleMiPedidoPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
