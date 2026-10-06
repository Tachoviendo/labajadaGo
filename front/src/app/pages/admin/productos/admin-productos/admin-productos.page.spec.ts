import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminProductosPage } from './admin-productos.page';

describe('AdminProductosPage', () => {
  let component: AdminProductosPage;
  let fixture: ComponentFixture<AdminProductosPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminProductosPage],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminProductosPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
