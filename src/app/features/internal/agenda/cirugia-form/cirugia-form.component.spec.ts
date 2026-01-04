import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CirugiaFormComponent } from './cirugia-form.component';

describe('CirugiaFormComponent', () => {
  let component: CirugiaFormComponent;
  let fixture: ComponentFixture<CirugiaFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CirugiaFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CirugiaFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
