import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { GestionarPedidoPage } from './gestionar-pedido.page';

describe('GestionarPedidoPage', () => {
  let component: GestionarPedidoPage;
  let fixture: ComponentFixture<GestionarPedidoPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestionarPedidoPage],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(GestionarPedidoPage);
    //el :id_pedido de la ruta llega como input (withComponentInputBinding)
    fixture.componentRef.setInput('id_pedido', 1);
    component = fixture.componentInstance;
    //los resources dejan la request pendiente (HttpClientTesting no responde), por eso
    //no se espera whenStable: alcanza con un ciclo de deteccion de cambios
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
