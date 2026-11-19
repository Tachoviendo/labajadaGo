import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { ConfirmarPedidoPage } from './confirmar-pedido.page';

describe('ConfirmarPedidoPage', () => {
  let component: ConfirmarPedidoPage;
  let fixture: ComponentFixture<ConfirmarPedidoPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmarPedidoPage],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmarPedidoPage);
    component = fixture.componentInstance;
    //los resources dejan la request pendiente (HttpClientTesting no responde), por eso
    //no se espera whenStable: alcanza con un ciclo de deteccion de cambios
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
