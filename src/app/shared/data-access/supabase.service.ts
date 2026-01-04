import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

export interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: 'client' | 'comercial' | 'soporte_tecnico' | 'logistica' | 'admin';
  area: string | null;
  company_name: string | null;
  phone: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Producto {
  id: string;
  codigo: string;
  nombre: string;
  categoria: string;
  precio: number;
  stock_minimo: number;
  es_activo: boolean;
  created_at: string;
}

export interface Inventario {
  id: string;
  producto_id: string;
  cantidad: number;
  ubicacion: string;
  estado: string;
  fecha_vencimiento: string | null;
  created_at: string;
  updated_at: string;
  producto?: Producto;
}

export interface MovimientoInventario {
  id: string;
  inventario_id: string;
  producto_id: string;
  tipo: string;
  cantidad: number;
  motivo: string;
  usuario_id: string;
  fecha: string;
  producto?: Producto;
  usuario?: UserProfile;
}

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {

  supabaseClient: SupabaseClient;

  constructor() {
    // Mantiene el mismo nombre y no es privado
    this.supabaseClient = createClient(environment.SUPABASE_URL, environment.SUPABASE_KEY);
  }

  get client() {
    return this.supabaseClient;
  }

  // ======================
  // AUTH & PERFILES
  // ======================
  async getSession() {
    const { data, error } = await this.supabaseClient.auth.getSession();
    if (error) throw error;
    return data.session;
  }

  async getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await this.supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .single();
      
      if (error) {
        console.error('Supabase error:', error);
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }
      return data;
    } catch (err) {
      console.error('getUserProfile error:', err);
      throw err;
    }
  }

  async createUserProfile(profileData: Partial<UserProfile>): Promise<UserProfile> {
    const { data, error } = await this.supabaseClient
      .from('profiles')
      .insert(profileData)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating profile:', error);
      throw error;
    }
    return data;
  }

  // ======================
  // PRODUCTOS
  // ======================
  async getProductos(): Promise<Producto[]> {
    const { data, error } = await this.supabaseClient
      .from('productos')
      .select('*')
      .eq('es_activo', true)
      .order('nombre');
    
    if (error) throw error;
    return data || [];
  }

  async getProductosConStock(): Promise<any[]> {
    const { data, error } = await this.supabaseClient
      .from('productos')
      .select(`
        *,
        inventario:inventario(
          id,
          cantidad,
          ubicacion,
          estado
        )
      `)
      .eq('es_activo', true)
      .order('nombre');
    
    if (error) throw error;
    return data || [];
  }

  // ======================
  // INVENTARIO
  // ======================
  async getInventarios(): Promise<Inventario[]> {
    const { data, error } = await this.supabaseClient
      .from('inventario')
      .select(`
        *,
        producto:productos(*)
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  async getInventariosByProducto(productoId: string): Promise<Inventario[]> {
    const { data, error } = await this.supabaseClient
      .from('inventario')
      .select(`
        *,
        producto:productos(*)
      `)
      .eq('producto_id', productoId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  async updateInventario(inventarioId: string, cantidad: number): Promise<void> {
    const { error } = await this.supabaseClient
      .from('inventario')
      .update({ 
        cantidad, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', inventarioId);
    
    if (error) throw error;
  }

  // ======================
  // MOVIMIENTOS DE INVENTARIO
  // ======================
  async createMovimiento(movimiento: Partial<MovimientoInventario>): Promise<MovimientoInventario> {
    const { data, error } = await this.supabaseClient
      .from('movimientos_inventario')
      .insert(movimiento)
      .select(`
        *,
        producto:productos(*),
        usuario:profiles(*)
      `)
      .single();
    
    if (error) throw error;
    return data;
  }


    async getCurrentUserId(): Promise<string | null> {
    const { data } = await this.client.auth.getUser();
    return data.user?.id ?? null;
  }


  
  

  async getMovimientos(): Promise<MovimientoInventario[]> {
    const { data, error } = await this.supabaseClient
      .from('movimientos_inventario')
      .select(`
        *,
        producto:productos(*),
        usuario:profiles(*)
      `)
      .order('fecha', { ascending: false })
      .limit(50);
    
    if (error) throw error;
    return data || [];
  }


  
}
