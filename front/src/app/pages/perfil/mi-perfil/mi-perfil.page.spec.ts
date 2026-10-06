import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MiPerfilPage } from './mi-perfil.page';

describe('MiPerfilPage', () => {
  let component: MiPerfilPage;
  let fixture: ComponentFixture<MiPerfilPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MiPerfilPage],
    }).compileComponents();

    fixture = TestBed.createComponent(MiPerfilPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
