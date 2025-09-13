import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DisponibilidadTecnicosComponent } from './disponibilidad-tecnicos.component';

describe('DisponibilidadTecnicosComponent', () => {
  let component: DisponibilidadTecnicosComponent;
  let fixture: ComponentFixture<DisponibilidadTecnicosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DisponibilidadTecnicosComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DisponibilidadTecnicosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
