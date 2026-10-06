import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminCategoriasPage } from './admin-categorias.page';

describe('AdminCategoriasPage', () => {
  let component: AdminCategoriasPage;
  let fixture: ComponentFixture<AdminCategoriasPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminCategoriasPage],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminCategoriasPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
