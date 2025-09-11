import { Component, inject } from '@angular/core';
import { AuthService } from '../../../auth/data-access/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-welcome-home',
  imports: [],
  templateUrl: './welcome-home.component.html',
  styleUrl: './welcome-home.component.css'
})
export default class WelcomeHomeComponent {

  private _authService = inject(AuthService);

  private _router = inject(Router);


  async logout() {

    await this._authService.logOut();
    this._router.navigate(['/auth/log-in']);
  }

}
