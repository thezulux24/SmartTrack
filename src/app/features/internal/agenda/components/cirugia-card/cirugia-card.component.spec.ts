import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CirugiaCardComponent } from './cirugia-card.component';

describe('CirugiaCardComponent', () => {
  let component: CirugiaCardComponent;
  let fixture: ComponentFixture<CirugiaCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CirugiaCardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CirugiaCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
