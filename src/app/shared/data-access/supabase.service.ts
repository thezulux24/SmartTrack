import { Injectable } from "@angular/core";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { environment } from "../../../environments/environment.development";


export interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: 'client' | 'comercial' | 'soporte_tecnico' | 'logistica' | 'admin';
  area: string | null;
  company_name: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

@Injectable({providedIn: 'root' })
export class SupabaseService {

    supabaseClient:  SupabaseClient;

    constructor() {
        this.supabaseClient = createClient(environment.SUPABASE_URL, environment.SUPABASE_KEY);

    }

      async getUserProfile(uid: string): Promise<UserProfile | null> {
    const { data, error } = await this.supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .single();
    
    if (error) {
      if (error.details?.includes('Row not found')) return null;
      throw error;
    }
    return data;
  }

  async createProfile(profile: Partial<UserProfile>): Promise<UserProfile> {
    const { data, error } = await this.supabaseClient
      .from('profiles')
      .insert(profile)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async getSession() {
  const { data, error } = await this.supabaseClient.auth.getSession();
  if (error) throw error;
  return data.session;
}

}