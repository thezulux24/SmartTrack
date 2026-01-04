import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InternalHomeComponent } from './internal-home.component';

describe('InternalHomeComponent', () => {
  let component: InternalHomeComponent;
  let fixture: ComponentFixture<InternalHomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InternalHomeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InternalHomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
