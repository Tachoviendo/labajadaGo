import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GestionarPedidoPage } from './gestionar-pedido.page';

describe('GestionarPedidoPage', () => {
  let component: GestionarPedidoPage;
  let fixture: ComponentFixture<GestionarPedidoPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestionarPedidoPage],
    }).compileComponents();

    fixture = TestBed.createComponent(GestionarPedidoPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
