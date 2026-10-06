import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfirmarPedidoPage } from './confirmar-pedido.page';

describe('ConfirmarPedidoPage', () => {
  let component: ConfirmarPedidoPage;
  let fixture: ComponentFixture<ConfirmarPedidoPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmarPedidoPage],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmarPedidoPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
