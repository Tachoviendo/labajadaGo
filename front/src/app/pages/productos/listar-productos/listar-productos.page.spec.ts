import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { ListarProductosPage } from './listar-productos.page';

describe('ListarProductosPage', () => {
  let component: ListarProductosPage;
  let fixture: ComponentFixture<ListarProductosPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListarProductosPage],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(ListarProductosPage);
    component = fixture.componentInstance;
    //los resources dejan la request pendiente (HttpClientTesting no responde), por eso
    //no se espera whenStable: alcanza con un ciclo de deteccion de cambios
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
