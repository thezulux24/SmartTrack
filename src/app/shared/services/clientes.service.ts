import { Injectable, inject } from '@angular/core';
import { Observable, from, map, catchError, of, switchMap } from 'rxjs';
import { SupabaseService } from '../data-access/supabase.service';

export interface Cliente {
  id: string;
  nombre: string;
  apellido: string;
  documento_tipo: string;
  documento_numero: string;
  fecha_nacimiento?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  ciudad?: string;
  pais: string;
  observaciones?: string;
  estado: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface CreateClienteRequest {
  nombre: string;
  apellido: string;
  documento_tipo: string;
  documento_numero: string;
  fecha_nacimiento?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  ciudad?: string;
  pais?: string;
  observaciones?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ClientesService {
  private readonly supabase = inject(SupabaseService);

  /**
   * Buscar cliente por número de documento
   */
  buscarPorDocumento(documento: string): Observable<Cliente | null> {
    return from(
      this.supabase.client
        .from('clientes')
        .select('*')
        .eq('documento_numero', documento)
        .eq('estado', 'activo')
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
        return data || null;
      }),
      catchError(error => {
        console.error('Error buscando cliente:', error);
        return of(null);
      })
    );
  }

  /**
   * Crear nuevo cliente
   */
  crear(cliente: CreateClienteRequest): Observable<Cliente> {
    return from(
      this.supabase.client
        .from('clientes')
        .insert({
          nombre: cliente.nombre,
          apellido: cliente.apellido,
          documento_tipo: cliente.documento_tipo || 'cedula',
          documento_numero: cliente.documento_numero,
          fecha_nacimiento: cliente.fecha_nacimiento,
          telefono: cliente.telefono,
          email: cliente.email,
          direccion: cliente.direccion,
          ciudad: cliente.ciudad,
          pais: cliente.pais || 'Ecuador',
          observaciones: cliente.observaciones,
          estado: 'activo'
        })
        .select('*')
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data;
      })
    );
  }

  /**
   * Obtener todos los clientes activos
   */
  getClientes(): Observable<Cliente[]> {
    return from(
      this.supabase.client
        .from('clientes')
        .select('*')
        .eq('estado', 'activo')
        .order('nombre', { ascending: true })
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data || [];
      })
    );
  }

  /**
   * Obtener cliente por ID
   */
  getById(id: string): Observable<Cliente | null> {
    return from(
      this.supabase.client
        .from('clientes')
        .select('*')
        .eq('id', id)
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error && error.code !== 'PGRST116') throw error;
        return data || null;
      })
    );
  }

  /**
   * Actualizar cliente
   */
  actualizar(id: string, cliente: Partial<CreateClienteRequest>): Observable<Cliente> {
    return from(
      this.supabase.client
        .from('clientes')
        .update({
          ...cliente,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select('*')
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data;
      })
    );
  }

  /**
   * Buscar clientes por texto (nombre, apellido, documento)
   */
  buscar(texto: string): Observable<Cliente[]> {
    if (!texto.trim()) {
      return this.getClientes();
    }

    return from(
      this.supabase.client
        .from('clientes')
        .select('*')
        .eq('estado', 'activo')
        .or(`nombre.ilike.%${texto}%,apellido.ilike.%${texto}%,documento_numero.ilike.%${texto}%`)
        .order('nombre', { ascending: true })
        .limit(10)
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data || [];
      })
    );
  }

  /**
   * Buscar o crear cliente por documento
   */
  buscarOCrear(clienteData: CreateClienteRequest): Observable<Cliente> {
    return this.buscarPorDocumento(clienteData.documento_numero).pipe(
      switchMap((clienteExistente: Cliente | null) => {
        if (clienteExistente) {
          return of(clienteExistente);
        } else {
          return this.crear(clienteData);
        }
      })
    );
  }
}