import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ClientesService, Cliente } from '../data-acces/clientes.service';
import { ClienteSuccessDialogComponent } from '../components/cliente-success-dialog.component';

@Component({
  selector: 'app-cliente-form',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, ClienteSuccessDialogComponent],
  templateUrl: './cliente-form.component.html',
  styleUrls: ['./cliente-form.component.css']
})
export class ClienteFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private clientesService = inject(ClientesService);

  form!: FormGroup;
  isEditing = signal(false);
  clienteId = signal<string | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);
  
  // Dialog signals
  showSuccessDialog = signal(false);
  successDialogTitle = signal('');
  isCreateAction = signal(false);

  documentoTipos = [
    { value: 'cedula', label: 'Cédula' },
    { value: 'pasaporte', label: 'Pasaporte' }
  ];

  estados = [
    { value: 'activo', label: 'Activo' },
    { value: 'inactivo', label: 'Inactivo' },
    { value: 'suspendido', label: 'Suspendido' }
  ];

  ngOnInit() {
    this.initForm();
    this.checkEditMode();
  }

  initForm() {
    this.form = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(100)]],
      apellido: ['', [Validators.required, Validators.maxLength(100)]],
      documento_tipo: ['cedula', Validators.required],
      documento_numero: ['', [Validators.required, Validators.maxLength(50)]],
      fecha_nacimiento: [''],
      telefono: ['', Validators.maxLength(20)],
      email: ['', [Validators.email, Validators.maxLength(255)]],
      direccion: [''],
      ciudad: ['', Validators.maxLength(100)],
      pais: ['Colombia', Validators.maxLength(100)],
      observaciones: [''],
      estado: ['activo', Validators.required]
    });
  }

  checkEditMode() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditing.set(true);
      this.clienteId.set(id);
      this.loadCliente(id);
    }
  }

  loadCliente(id: string) {
    this.loading.set(true);
    this.clientesService.getClienteById(id).subscribe({
      next: (cliente) => {
        this.form.patchValue({
          ...cliente,
          fecha_nacimiento: cliente.fecha_nacimiento || ''
        });
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Error al cargar el cliente');
        this.loading.set(false);
        console.error('Error:', err);
      }
    });
  }

  onSubmit() {
    if (this.form.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const formValue = this.form.value;
    const clienteData: Omit<Cliente, 'id' | 'created_at' | 'updated_at'> = {
      ...formValue,
      fecha_nacimiento: formValue.fecha_nacimiento || null
    };

    const operation = this.isEditing() && this.clienteId()
      ? this.clientesService.updateCliente(this.clienteId()!, clienteData)
      : this.clientesService.createCliente(clienteData);

    operation.subscribe({
      next: () => {
        this.loading.set(false);
        if (this.isEditing()) {
          this.successDialogTitle.set('Los datos del cliente se\nactualizaron exitosamente');
          this.isCreateAction.set(false);
        } else {
          this.successDialogTitle.set('Nuevo cliente creado\nexitosamente');
          this.isCreateAction.set(true);
        }
        this.showSuccessDialog.set(true);
      },
      error: (err) => {
        this.error.set(this.isEditing() ? 'Error al actualizar el cliente' : 'Error al crear el cliente');
        this.loading.set(false);
        console.error('Error:', err);
      }
    });
  }

  onSuccessDialogClose() {
    this.showSuccessDialog.set(false);
    this.router.navigate(['/internal/clientes']);
  }

  onCrearOtroCliente() {
    this.showSuccessDialog.set(false);
    this.form.reset({
      documento_tipo: 'cedula',
      pais: 'Colombia',
      estado: 'activo'
    });
    this.error.set(null);
  }

  markFormGroupTouched() {
    Object.keys(this.form.controls).forEach(key => {
      const control = this.form.get(key);
      control?.markAsTouched();
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.form.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  getFieldError(fieldName: string): string {
    const field = this.form.get(fieldName);
    if (field && field.errors && field.touched) {
      if (field.errors['required']) return 'Este campo es requerido';
      if (field.errors['email']) return 'Email inválido';
      if (field.errors['maxlength']) return `Máximo ${field.errors['maxlength'].requiredLength} caracteres`;
    }
    return '';
  }
}