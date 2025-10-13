import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { SupabaseService } from '../data-access/supabase.service';
import { AuthService } from '../../auth/data-access/auth.service';

interface UserProfile {
  full_name: string;
  email: string;
  role: string;
}

@Component({
  selector: 'app-profile-menu',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Avatar Button -->
    <button 
      (click)="toggleMenu()"
      class="relative flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-[#C8D900] to-[#0098A8] hover:scale-105 transition-transform duration-200 shadow-lg ring-2 ring-white/30">
      <span class="text-[#10284C] font-bold text-lg">
        {{ getInitial() }}
      </span>
      @if (isMenuOpen()) {
        <div class="absolute -bottom-1 -right-1 w-3 h-3 bg-[#C8D900] rounded-full border-2 border-[#10284C]"></div>
      }
    </button>

    <!-- Overlay -->
    @if (isMenuOpen()) {
      <div 
        [@fadeIn]
        (click)="closeMenu()"
        class="fixed inset-0 bg-black/50 backdrop-blur-sm z-40">
      </div>
    }

    <!-- Sidebar Menu -->
    <div 
      [@slideIn]="isMenuOpen() ? 'open' : 'closed'"
      class="fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-50 flex flex-col">
      
      <!-- Header con gradiente -->
      <div class="relative bg-gradient-to-br from-[#10284C] via-[#0098A8] to-[#0098A8] p-6 pb-20">
        <!-- Botón cerrar -->
        <button 
          (click)="closeMenu()"
          class="absolute top-4 right-4 text-white/80 hover:text-white transition-colors">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>

        <!-- Avatar grande -->
        <div class="flex flex-col items-center mt-4">
          <div class="w-20 h-20 rounded-full bg-gradient-to-br from-[#C8D900] to-[#C8D900]/80 flex items-center justify-center shadow-xl ring-4 ring-white/30">
            <span class="text-[#10284C] font-bold text-3xl">
              {{ getInitial() }}
            </span>
          </div>
        </div>
      </div>

      <!-- Información del usuario -->
      <div class="bg-gradient-to-br from-white to-[#0098A8]/3 -mt-12 mx-4 rounded-2xl shadow-lg p-6 relative z-10">
        <div class="text-center">
          <h3 class="text-xl font-bold text-[#10284C] mb-1">
            {{ userProfile()?.full_name || 'Usuario' }}
          </h3>
          <p class="text-sm text-gray-600 mb-3">
            {{ userProfile()?.email || 'Sin email' }}
          </p>
          <div class="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#0098A8] to-[#0098A8]/80 rounded-full shadow-md">
            <div class="w-2 h-2 bg-[#C8D900] rounded-full animate-pulse"></div>
            <span class="text-sm font-bold text-white">
              {{ getRoleDisplay() }}
            </span>
          </div>
        </div>
      </div>

      <!-- Opciones del menú -->
      <div class="flex-1 overflow-y-auto p-4">
        <div class="space-y-2">
          
          <!-- Mi Perfil -->
          <button 
            (click)="navigateTo('/internal/perfil')"
            class="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gradient-to-r hover:from-[#0098A8]/5 hover:to-[#C8D900]/5 transition-all duration-200 group border border-transparent hover:border-[#0098A8]/20">
            <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-[#0098A8] to-[#0098A8]/80 flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
            </div>
            <div class="flex-1 text-left">
              <p class="text-sm font-bold text-gray-900 group-hover:text-[#0098A8] transition-colors">Mi Perfil</p>
              <p class="text-xs text-gray-500">Editar información</p>
            </div>
            <svg class="w-5 h-5 text-gray-400 group-hover:text-[#0098A8] group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          </button>

          <!-- Configuración -->
          <button 
            (click)="navigateTo('/internal/configuracion')"
            class="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gradient-to-r hover:from-[#C8D900]/5 hover:to-[#0098A8]/5 transition-all duration-200 group border border-transparent hover:border-[#C8D900]/20">
            <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-[#C8D900] to-[#C8D900]/80 flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
              <svg class="w-5 h-5 text-[#10284C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
            </div>
            <div class="flex-1 text-left">
              <p class="text-sm font-bold text-gray-900 group-hover:text-[#C8D900] transition-colors">Configuración</p>
              <p class="text-xs text-gray-500">Preferencias</p>
            </div>
            <svg class="w-5 h-5 text-gray-400 group-hover:text-[#C8D900] group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          </button>

          <!-- Notificaciones -->
          <button 
            (click)="navigateTo('/internal/notificaciones')"
            class="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gradient-to-r hover:from-[#10284C]/5 hover:to-[#0098A8]/5 transition-all duration-200 group border border-transparent hover:border-[#10284C]/20">
            <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-[#10284C] to-[#10284C]/80 flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
              </svg>
            </div>
            <div class="flex-1 text-left">
              <p class="text-sm font-bold text-gray-900 group-hover:text-[#10284C] transition-colors">Notificaciones</p>
              <p class="text-xs text-gray-500">Preferencias de alertas</p>
            </div>
            <svg class="w-5 h-5 text-gray-400 group-hover:text-[#10284C] group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          </button>

          <!-- Divider -->
          <div class="py-2">
            <div class="border-t-2 border-[#C8D900]/20"></div>
          </div>

          <!-- Ayuda -->
          <button 
            (click)="navigateTo('/internal/ayuda')"
            class="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gradient-to-r hover:from-gray-50 hover:to-[#0098A8]/5 transition-all duration-200 group border border-transparent hover:border-gray-200">
            <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
              <svg class="w-5 h-5 text-gray-600 group-hover:text-[#0098A8] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <div class="flex-1 text-left">
              <p class="text-sm font-bold text-gray-900 group-hover:text-[#0098A8] transition-colors">Ayuda y Soporte</p>
              <p class="text-xs text-gray-500">Centro de ayuda</p>
            </div>
            <svg class="w-5 h-5 text-gray-400 group-hover:text-[#0098A8] group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          </button>

        </div>
      </div>

      <!-- Footer con botón Cerrar Sesión -->
      <div class="p-4 border-t-2 border-[#10284C]/20 bg-gradient-to-b from-gray-50 to-white">
        <button 
          (click)="logout()"
          class="w-full flex items-center justify-center gap-3 p-4 rounded-xl bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white transition-all duration-200 shadow-lg hover:shadow-2xl transform hover:scale-[1.02] border-2 border-red-700/20">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
          </svg>
          <span class="font-semibold">Cerrar Sesión</span>
        </button>
      </div>

    </div>
  `,
  animations: [
    trigger('slideIn', [
      state('closed', style({
        transform: 'translateX(100%)',
        opacity: 0
      })),
      state('open', style({
        transform: 'translateX(0)',
        opacity: 1
      })),
      transition('closed => open', [
        animate('300ms cubic-bezier(0.4, 0, 0.2, 1)')
      ]),
      transition('open => closed', [
        animate('250ms cubic-bezier(0.4, 0, 0.2, 1)')
      ])
    ]),
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('200ms', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('150ms', style({ opacity: 0 }))
      ])
    ])
  ]
})
export class ProfileMenuComponent implements OnInit {
  private supabaseService = inject(SupabaseService);
  private authService = inject(AuthService);
  private router = inject(Router);

  isMenuOpen = signal(false);
  userProfile = signal<UserProfile | null>(null);

  async ngOnInit() {
    await this.loadUserProfile();
  }

  async loadUserProfile() {
    try {
      const session = await this.supabaseService.getSession();
      if (session?.user?.id) {
        const profile = await this.supabaseService.getUserProfile(session.user.id);
        if (profile) {
          this.userProfile.set({
            full_name: profile.full_name || 'Usuario',
            email: session.user.email || 'Sin email',
            role: profile.role || 'Sin rol'
          });
        }
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  }

  toggleMenu() {
    this.isMenuOpen.set(!this.isMenuOpen());
  }

  closeMenu() {
    this.isMenuOpen.set(false);
  }

  getInitial(): string {
    const name = this.userProfile()?.full_name || 'U';
    return name.charAt(0).toUpperCase();
  }

  getRoleDisplay(): string {
    const role = this.userProfile()?.role || '';
    const roleMap: Record<string, string> = {
      'admin': 'Administrador',
      'comercial': 'Comercial',
      'logistica': 'Logística',
      'soporte_tecnico': 'Soporte Técnico',
      'client': 'Cliente'
    };
    return roleMap[role] || role;
  }

  navigateTo(route: string) {
    this.closeMenu();
    this.router.navigate([route]);
  }

  async logout() {
    this.closeMenu();
    await this.authService.logOut();
    this.router.navigate(['/auth/log-in']);
  }
}
