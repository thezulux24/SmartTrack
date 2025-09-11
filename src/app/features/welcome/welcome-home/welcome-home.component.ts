import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../auth/data-access/auth.service';
import { SupabaseService } from '../../../shared/data-access/supabase.service';
import { Router } from '@angular/router';

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: 'client' | 'comercial' | 'soporte_tecnico' | 'logistica' | 'admin';
  area: string | null;
  company_name: string | null;
  phone: string | null;
  is_active: boolean;
}

@Component({
  selector: 'app-welcome-home',
  imports: [CommonModule],
  templateUrl: './welcome-home.component.html',
  styleUrl: './welcome-home.component.css'
})
export default class WelcomeHomeComponent implements OnInit {

  private _authService = inject(AuthService);
  private _supabaseService = inject(SupabaseService);
  private _router = inject(Router);

  loading = true;
  userProfile: UserProfile | null = null;
  error: string | null = null;

  async ngOnInit(): Promise<void> {
    try {
      const session = await this._supabaseService.getSession();
      const uid = session?.user?.id;
      
      if (!uid) {
        this._router.navigate(['/auth']);
        return;
      }

      const profile = await this._supabaseService.getUserProfile(uid);
      if (!profile) {
        this.error = 'No se encontró perfil de usuario';
        return;
      }

      this.userProfile = profile;
    } catch (err: any) {
      console.error('Error cargando perfil:', err);
      this.error = err?.message ?? 'Error al cargar información del usuario';
    } finally {
      this.loading = false;
    }
  }

  get displayName(): string {
    return this.userProfile?.full_name || this.userProfile?.email || 'Usuario';
  }

  get roleDisplayName(): string {
    const roleMap: Record<string, string> = {
      'client': 'Cliente',
      'comercial': 'Comercial',
      'soporte_tecnico': 'Soporte Técnico',
      'logistica': 'Logística',
      'admin': 'Administrador'
    };
    return roleMap[this.userProfile?.role || ''] || this.userProfile?.role || 'Sin rol';
  }

  get organizationName(): string {
    if (this.userProfile?.role === 'client') {
      return this.userProfile.company_name || 'Organización no especificada';
    }
    return 'Implameq S.A.S.';
  }

  acceder(): void {
    if (!this.userProfile?.role) return;

    const role = this.userProfile.role;
    if (role === 'client') {
      this._router.navigate(['/client']);
    } else {
      // roles internos: comercial, soporte_tecnico, logistica, admin
      this._router.navigate(['/internal']);
    }
  }

  async logout() {
    await this._authService.logOut();
    this._router.navigate(['/auth/log-in']);
  }
}