import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FiltrosAgendaComponent } from './filtros-agenda.component';

describe('FiltrosAgendaComponent', () => {
  let component: FiltrosAgendaComponent;
  let fixture: ComponentFixture<FiltrosAgendaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FiltrosAgendaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FiltrosAgendaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
