import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PanelPage } from './panel.page';

describe('PanelPage', () => {
  let component: PanelPage;
  let fixture: ComponentFixture<PanelPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PanelPage],
    }).compileComponents();

    fixture = TestBed.createComponent(PanelPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
