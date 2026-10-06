import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListarProductosPage } from './listar-productos.page';

describe('ListarProductosPage', () => {
  let component: ListarProductosPage;
  let fixture: ComponentFixture<ListarProductosPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListarProductosPage],
    }).compileComponents();

    fixture = TestBed.createComponent(ListarProductosPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
