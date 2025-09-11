import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WelcomeShellComponent } from './welcome-shell.component';

describe('WelcomeShellComponent', () => {
  let component: WelcomeShellComponent;
  let fixture: ComponentFixture<WelcomeShellComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WelcomeShellComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WelcomeShellComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
