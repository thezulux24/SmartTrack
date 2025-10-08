import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AsignarMensajeroComponent } from './asignar-mensajero.component';

describe('AsignarMensajeroComponent', () => {
  let component: AsignarMensajeroComponent;
  let fixture: ComponentFixture<AsignarMensajeroComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AsignarMensajeroComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AsignarMensajeroComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
