import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UsuariosInternosPage } from './usuarios-internos.page';

describe('UsuariosInternosPage', () => {
  let component: UsuariosInternosPage;
  let fixture: ComponentFixture<UsuariosInternosPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UsuariosInternosPage],
    }).compileComponents();

    fixture = TestBed.createComponent(UsuariosInternosPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
