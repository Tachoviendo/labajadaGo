import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PedidosEntrantesPage } from './pedidos-entrantes.page';

describe('PedidosEntrantesPage', () => {
  let component: PedidosEntrantesPage;
  let fixture: ComponentFixture<PedidosEntrantesPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PedidosEntrantesPage],
    }).compileComponents();

    fixture = TestBed.createComponent(PedidosEntrantesPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
