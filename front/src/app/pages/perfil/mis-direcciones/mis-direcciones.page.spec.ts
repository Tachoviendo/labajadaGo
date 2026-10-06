import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MisDireccionesPage } from './mis-direcciones.page';

describe('MisDireccionesPage', () => {
  let component: MisDireccionesPage;
  let fixture: ComponentFixture<MisDireccionesPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MisDireccionesPage],
    }).compileComponents();

    fixture = TestBed.createComponent(MisDireccionesPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
