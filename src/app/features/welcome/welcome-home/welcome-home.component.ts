import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../../auth/data-access/auth.service';
import { SupabaseService } from '../../../shared/data-access/supabase.service';
import { Router } from '@angular/router';

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: 'client' | 'comercial' | 'soporte_tecnico' | 'logistica' | 'admin';
  area: string | null;
  phone: string | null;
  is_active: boolean;
}

@Component({
  selector: 'app-welcome-home',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './welcome-home.component.html',
  styleUrl: './welcome-home.component.css'
})
export default class WelcomeHomeComponent implements OnInit {

  private _authService = inject(AuthService);
  private _supabaseService = inject(SupabaseService);
  private _router = inject(Router);
  private _fb = inject(FormBuilder);

  loading = true;
  userProfile: UserProfile | null = null;
  error: string | null = null;
  showProfileForm = false;
  savingProfile = false;

  profileForm: FormGroup = this._fb.group({
    full_name: ['', [Validators.required, Validators.minLength(2)]],
    role: ['', Validators.required],
    area: [''],
    phone: ['', [Validators.pattern(/^[\+]?[\d\s\-\(\)]+$/)]]
  });

  roleOptions = [
    { value: 'comercial', label: 'Comercial', area: 'comercial' },
    { value: 'soporte_tecnico', label: 'Soporte Técnico', area: 'soporte' },
    { value: 'logistica', label: 'Logística', area: 'logistica' },
    { value: 'admin', label: 'Administrador', area: 'admin' }
  ];

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
        // No tiene perfil, mostrar formulario para crearlo
        this.showProfileForm = true;
        this.profileForm.patchValue({
          full_name: session.user.user_metadata?.['full_name'] || '',
        });
      } else {
        this.userProfile = profile;
      }
    } catch (err: any) {
      console.error('Error cargando perfil:', err);
      this.error = err?.message ?? 'Error al cargar información del usuario';
    } finally {
      this.loading = false;
    }
  }

  async onSubmitProfile(): Promise<void> {
    if (this.profileForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.savingProfile = true;
    
    try {
      const session = await this._supabaseService.getSession();
      const uid = session?.user?.id;
      
      if (!uid) {
        throw new Error('No se encontró sesión de usuario');
      }

      const formValue = this.profileForm.value;
      const selectedRole = this.roleOptions.find(r => r.value === formValue.role);

      const profileData = {
        id: uid,
        full_name: formValue.full_name,
        email: session.user.email,
        role: formValue.role,
        area: selectedRole?.area || formValue.role,
        phone: formValue.phone || null,
        is_active: true
      };

      const newProfile = await this._supabaseService.createUserProfile(profileData);
      this.userProfile = newProfile;
      this.showProfileForm = false;
      this.error = null;
    } catch (err: any) {
      console.error('Error creando perfil:', err);
      this.error = err?.message ?? 'Error al crear el perfil';
    } finally {
      this.savingProfile = false;
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.profileForm.controls).forEach(key => {
      this.profileForm.get(key)?.markAsTouched();
    });
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

  acceder(): void {
    if (!this.userProfile?.role) return;
    
    // Redirigir según el rol
    if (this.userProfile.role === 'client') {
      this._router.navigate(['/client']);
    } else {
      this._router.navigate(['/internal']);
    }
  }

  async logout() {
    await this._authService.logOut();
    this._router.navigate(['/auth/log-in']);
  }
}