import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AltaEdicionProductoPage } from './alta-edicion-producto.page';

describe('AltaEdicionProductoPage', () => {
  let component: AltaEdicionProductoPage;
  let fixture: ComponentFixture<AltaEdicionProductoPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AltaEdicionProductoPage],
    }).compileComponents();

    fixture = TestBed.createComponent(AltaEdicionProductoPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
