import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SeguimientoCirugiaComponent } from './seguimiento-cirugia.component';

describe('SeguimientoCirugiaComponent', () => {
  let component: SeguimientoCirugiaComponent;
  let fixture: ComponentFixture<SeguimientoCirugiaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SeguimientoCirugiaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SeguimientoCirugiaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
