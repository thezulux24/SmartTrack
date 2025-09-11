import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../auth/data-access/auth.service';

@Component({
  selector: 'app-internal-home',
  imports: [CommonModule],
  templateUrl: './internal-home.component.html',
  styleUrl: './internal-home.component.css'
})
export default class InternalHomeComponent implements OnInit {

  private _authService = inject(AuthService);
  private _router = inject(Router);

  ngOnInit(): void {
  }

  async logout() {
    await this._authService.logOut();
    this._router.navigate(['/auth/log-in']);
  }
}