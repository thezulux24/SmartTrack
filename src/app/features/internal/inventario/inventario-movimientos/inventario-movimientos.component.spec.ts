import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InventarioMovimientosComponent } from './inventario-movimientos.component';

describe('InventarioMovimientosComponent', () => {
  let component: InventarioMovimientosComponent;
  let fixture: ComponentFixture<InventarioMovimientosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InventarioMovimientosComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InventarioMovimientosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
