import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ClientesService, Cliente } from '../data-acces/clientes.service';
import { ClienteConfirmDialogComponent } from '../components/cliente-confirm-dialog.component';
import { ClienteSuccessDialogComponent } from '../components/cliente-success-dialog.component';

@Component({
  selector: 'app-clientes-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ClienteConfirmDialogComponent, ClienteSuccessDialogComponent],
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
  
  // Dialog signals
  showConfirmDialog = signal(false);
  showSuccessDialog = signal(false);
  clienteToDelete = signal<Cliente | null>(null);

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
    this.clienteToDelete.set(cliente);
    this.showConfirmDialog.set(true);
  }

  onConfirmDelete() {
    const cliente = this.clienteToDelete();
    if (!cliente || !cliente.id) return;

    this.showConfirmDialog.set(false);

    this.clientesService.deleteCliente(cliente.id).subscribe({
      next: () => {
        this.showSuccessDialog.set(true);
        this.loadClientes();
      },
      error: (err) => {
        this.error.set('Error al eliminar el cliente');
        console.error('Error:', err);
        this.clienteToDelete.set(null);
      }
    });
  }

  onCancelDelete() {
    this.showConfirmDialog.set(false);
    this.clienteToDelete.set(null);
  }

  onSuccessDialogClose() {
    this.showSuccessDialog.set(false);
    this.clienteToDelete.set(null);
  }

  getClienteNombreCompleto(): string {
    const cliente = this.clienteToDelete();
    if (!cliente) return '';
    return `${cliente.nombre} ${cliente.apellido}`;
  }

  getEstadoBadgeClass(estado: string | undefined): string {
    switch (estado) {
      case 'activo':
        return 'bg-green-500 text-white font-medium';
      case 'inactivo':
        return 'bg-gray-400 text-white font-medium';
      case 'suspendido':
        return 'bg-fuchsia-600 text-white font-medium';
      default:
        return 'bg-gray-400 text-white font-medium';
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