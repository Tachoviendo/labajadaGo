import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { MisDireccionesPage } from './mis-direcciones.page';

describe('MisDireccionesPage', () => {
  let component: MisDireccionesPage;
  let fixture: ComponentFixture<MisDireccionesPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MisDireccionesPage],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(MisDireccionesPage);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
