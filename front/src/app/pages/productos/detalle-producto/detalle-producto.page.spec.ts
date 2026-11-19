import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { DetalleProductoPage } from './detalle-producto.page';

describe('DetalleProductoPage', () => {
  let component: DetalleProductoPage;
  let fixture: ComponentFixture<DetalleProductoPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetalleProductoPage],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(DetalleProductoPage);
    //el :id de la ruta llega como input (withComponentInputBinding)
    fixture.componentRef.setInput('id', 1);
    component = fixture.componentInstance;
    //los resources dejan la request pendiente (HttpClientTesting no responde), por eso
    //no se espera whenStable: alcanza con un ciclo de deteccion de cambios
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
