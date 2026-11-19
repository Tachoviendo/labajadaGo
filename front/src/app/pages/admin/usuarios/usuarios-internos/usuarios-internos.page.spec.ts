import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { UsuariosInternosPage } from './usuarios-internos.page';

describe('UsuariosInternosPage', () => {
  let component: UsuariosInternosPage;
  let fixture: ComponentFixture<UsuariosInternosPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UsuariosInternosPage],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(UsuariosInternosPage);
    component = fixture.componentInstance;
    //los resources dejan la request pendiente (HttpClientTesting no responde), por eso
    //no se espera whenStable: alcanza con un ciclo de deteccion de cambios
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
