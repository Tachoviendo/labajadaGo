import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VerCarritoPage } from './ver-carrito.page';

describe('VerCarritoPage', () => {
  let component: VerCarritoPage;
  let fixture: ComponentFixture<VerCarritoPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VerCarritoPage],
    }).compileComponents();

    fixture = TestBed.createComponent(VerCarritoPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
