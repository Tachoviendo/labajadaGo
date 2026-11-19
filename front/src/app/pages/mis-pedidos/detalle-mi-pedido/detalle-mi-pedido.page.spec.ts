import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { DetalleMiPedidoPage } from './detalle-mi-pedido.page';

describe('DetalleMiPedidoPage', () => {
  let component: DetalleMiPedidoPage;
  let fixture: ComponentFixture<DetalleMiPedidoPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetalleMiPedidoPage],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(DetalleMiPedidoPage);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
