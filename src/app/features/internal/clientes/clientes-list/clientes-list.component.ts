import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ClientesService, Cliente } from '../data-acces/clientes.service';

@Component({
  selector: 'app-clientes-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './clientes-list.component.html',
  styleUrls: ['./clientes-list.component.css']
})
export class ClientesListComponent implements OnInit {
  private clientesService = inject(ClientesService);

  clientes = signal<Cliente[]>([]);
  filteredClientes = signal<Cliente[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  searchTerm = signal('');
  selectedEstado = signal('');

  ngOnInit() {
    this.loadClientes();
  }

  loadClientes() {
    this.loading.set(true);
    this.error.set(null);

    this.clientesService.getClientes().subscribe({
      next: (clientes) => {
        this.clientes.set(clientes);
        this.applyFilters();
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Error al cargar los clientes');
        this.loading.set(false);
        console.error('Error:', err);
      }
    });
  }

  onSearchChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.searchTerm.set(target.value);
    this.applyFilters();
  }

  onEstadoChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.selectedEstado.set(target.value);
    this.applyFilters();
  }

  applyFilters() {
    let filtered = this.clientes();

    // Filtro por término de búsqueda
    if (this.searchTerm()) {
      const term = this.searchTerm().toLowerCase();
      filtered = filtered.filter(cliente =>
        cliente.nombre.toLowerCase().includes(term) ||
        cliente.apellido.toLowerCase().includes(term) ||
        cliente.documento_numero.toLowerCase().includes(term) ||
        (cliente.email && cliente.email.toLowerCase().includes(term))
      );
    }

    // Filtro por estado
    if (this.selectedEstado()) {
      filtered = filtered.filter(cliente => cliente.estado === this.selectedEstado());
    }

    this.filteredClientes.set(filtered);
  }

  deleteCliente(cliente: Cliente) {
    if (!cliente.id) return;

    if (confirm(`¿Estás seguro de eliminar al cliente ${cliente.nombre} ${cliente.apellido}?`)) {
      this.clientesService.deleteCliente(cliente.id).subscribe({
        next: () => {
          this.loadClientes();
        },
        error: (err) => {
          this.error.set('Error al eliminar el cliente');
          console.error('Error:', err);
        }
      });
    }
  }

  getEstadoBadgeClass(estado: string | undefined): string {
    switch (estado) {
      case 'activo':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'inactivo':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
      case 'suspendido':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  }

  getEstadoLabel(estado: string | undefined): string {
    switch (estado) {
      case 'activo':
        return 'Activo';
      case 'inactivo':
        return 'Inactivo';
      case 'suspendido':
        return 'Suspendido';
      default:
        return estado || 'Sin estado';
    }
  }

  formatFecha(fecha?: string): string {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleDateString('es-EC');
  }
}