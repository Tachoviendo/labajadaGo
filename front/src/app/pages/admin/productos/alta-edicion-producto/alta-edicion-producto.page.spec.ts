import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { AltaEdicionProductoPage } from './alta-edicion-producto.page';

describe('AltaEdicionProductoPage', () => {
  let component: AltaEdicionProductoPage;
  let fixture: ComponentFixture<AltaEdicionProductoPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AltaEdicionProductoPage],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(AltaEdicionProductoPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
