import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CirugiaDetailComponent } from './cirugia-detail.component';

describe('CirugiaDetailComponent', () => {
  let component: CirugiaDetailComponent;
  let fixture: ComponentFixture<CirugiaDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CirugiaDetailComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CirugiaDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
