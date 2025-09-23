import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../../shared/data-access/supabase.service';
import { from, Observable } from 'rxjs';

export interface Cliente {
  id?: string;
  nombre: string;
  apellido: string;
  documento_tipo: 'cedula' | 'pasaporte' | 'ruc';
  documento_numero: string;
  fecha_nacimiento?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  ciudad?: string;
  pais?: string;
  observaciones?: string;
  estado: 'activo' | 'inactivo' | 'suspendido';
  created_at?: string;
  updated_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ClientesService {
  private supabase = inject(SupabaseService);

  getClientes(): Observable<Cliente[]> {
    return from(
      this.supabase.client
        .from('clientes')
        .select('*')
        .order('created_at', { ascending: false })
        .then(({ data, error }) => {
          if (error) throw error;
          return data || [];
        })
    );
  }

  getClienteById(id: string): Observable<Cliente> {
    return from(
      this.supabase.client
        .from('clientes')
        .select('*')
        .eq('id', id)
        .single()
        .then(({ data, error }) => {
          if (error) throw error;
          return data;
        })
    );
  }

  createCliente(cliente: Omit<Cliente, 'id' | 'created_at' | 'updated_at'>): Observable<Cliente> {
    return from(
      this.supabase.client
        .from('clientes')
        .insert([cliente])
        .select()
        .single()
        .then(({ data, error }) => {
          if (error) throw error;
          return data;
        })
    );
  }

  updateCliente(id: string, cliente: Partial<Cliente>): Observable<Cliente> {
    return from(
      this.supabase.client
        .from('clientes')
        .update(cliente)
        .eq('id', id)
        .select()
        .single()
        .then(({ data, error }) => {
          if (error) throw error;
          return data;
        })
    );
  }

  deleteCliente(id: string): Observable<void> {
    return from(
      this.supabase.client
        .from('clientes')
        .delete()
        .eq('id', id)
        .then(({ error }) => {
          if (error) throw error;
        })
    );
  }

  searchClientes(searchTerm: string): Observable<Cliente[]> {
    return from(
      this.supabase.client
        .from('clientes')
        .select('*')
        .or(`nombre.ilike.%${searchTerm}%,apellido.ilike.%${searchTerm}%,documento_numero.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
        .order('created_at', { ascending: false })
        .then(({ data, error }) => {
          if (error) throw error;
          return data || [];
        })
    );
  }

  getClientesActivos(): Observable<Cliente[]> {
    return from(
      this.supabase.client
        .from('clientes')
        .select('*')
        .eq('estado', 'activo')
        .order('nombre', { ascending: true })
        .then(({ data, error }) => {
          if (error) throw error;
          return data || [];
        })
    );
  }
}