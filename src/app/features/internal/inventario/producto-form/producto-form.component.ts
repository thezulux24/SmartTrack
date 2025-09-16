import { Component, OnInit, signal, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { switchMap } from 'rxjs/operators';

import { ProductosService } from '../data-access/productos.service';
import { Producto } from '../data-access/models/producto.model';

@Component({
  selector: 'app-producto-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './producto-form.component.html',
  styleUrl: './producto-form.component.css'
})
export class ProductoFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private productosService = inject(ProductosService);

  // Signals
  loading = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);
  isEditing = signal(false);

  // Form
  productoForm: FormGroup = this.fb.group({
    codigo: [''],
    nombre: ['', [Validators.required, Validators.minLength(3)]],
    descripcion: [''],
    categoria: ['', Validators.required],
    precio: [0, [Validators.required, Validators.min(0)]],
    stock_minimo: [1, [Validators.required, Validators.min(0)]],
    unidad_medida: ['unidad', Validators.required],
    proveedor: [''],
    ubicacion_principal: ['bodega_central'], // ✅ Cambiar default
    notas: ['']
  });

  // ✅ Opciones organizadas
  ubicacionesOrganizadas = this.productosService.getUbicacionesOrganizadas();

  // Opciones con labels
  categoriasOptions = [
    { value: 'implantes', label: 'Implantes' },
    { value: 'instrumentos', label: 'Instrumentos Quirúrgicos' },
    { value: 'consumibles', label: 'Consumibles' },
    { value: 'equipos', label: 'Equipos Médicos' },
    { value: 'medicamentos', label: 'Medicamentos' }
  ];

  ubicacionesOptions = [
    { value: 'bodega', label: 'Bodega Principal' },
    { value: 'quirofano_1', label: 'Quirófano 1' },
    { value: 'quirofano_2', label: 'Quirófano 2' },
    { value: 'quirofano_3', label: 'Quirófano 3' },
    { value: 'emergencia', label: 'Emergencia' },
    { value: 'esterilizacion', label: 'Esterilización' }
  ];

  unidadesMedidaOptions = [
    { value: 'unidad', label: 'Unidad' },
    { value: 'caja', label: 'Caja' },
    { value: 'paquete', label: 'Paquete' },
    { value: 'metro', label: 'Metro' },
    { value: 'kilogramo', label: 'Kilogramo' },
    { value: 'litro', label: 'Litro' },
    { value: 'mililitro', label: 'Mililitro' },
    { value: 'gramo', label: 'Gramo' }
  ];

  ngOnInit() {
    console.log('🚀 ProductoFormComponent iniciando...');
    this.checkEditMode();
  }

  private checkEditMode() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditing.set(true);
      this.loadProducto(id);
    }
  }

  private loadProducto(id: string) {
    this.loading.set(true);
    this.error.set(null);

    this.productosService.getProductoById(id).subscribe({
      next: (producto) => {
        console.log('✅ Producto cargado para edición:', producto);
        this.productoForm.patchValue(producto);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('❌ Error loading producto:', err);
        this.error.set('Error al cargar el producto: ' + (err?.message || err));
        this.loading.set(false);
      }
    });
  }

  onSubmit() {
    if (this.productoForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    const formData = this.productoForm.value;
    console.log('📝 Enviando datos del producto:', formData);

    this.loading.set(true);
    this.error.set(null);
    this.success.set(null);

    const operation = this.isEditing() 
      ? this.updateProducto(formData)
      : this.createProducto(formData);

    operation.subscribe({
      next: (producto) => {
        console.log('✅ Producto guardado:', producto);
        const message = this.isEditing() 
          ? 'Producto actualizado exitosamente' 
          : 'Producto creado exitosamente';
        this.success.set(message);
        this.loading.set(false);
        
        // Redirigir después de un momento
        setTimeout(() => {
          this.router.navigate(['/internal/inventario']);
        }, 2000);
      },
      error: (err) => {
        console.error('❌ Error guardando producto:', err);
        this.error.set('Error al guardar el producto: ' + (err?.message || err));
        this.loading.set(false);
      }
    });
  }

  private createProducto(formData: any) {
    return this.productosService.createProducto(formData);
  }

  private updateProducto(formData: any) {
    const id = this.route.snapshot.paramMap.get('id')!;
    return this.productosService.updateProducto(id, formData);
  }

  onCancel() {
    this.router.navigate(['/internal/inventario']);
  }

  // Utilidades de validación
  isFieldInvalid(fieldName: string): boolean {
    const field = this.productoForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.productoForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return 'Este campo es requerido';
      if (field.errors['minlength']) return `Mínimo ${field.errors['minlength'].requiredLength} caracteres`;
      if (field.errors['min']) return `El valor mínimo es ${field.errors['min'].min}`;
    }
    return '';
  }

  private markFormGroupTouched() {
    Object.keys(this.productoForm.controls).forEach(key => {
      const control = this.productoForm.get(key);
      control?.markAsTouched();
    });
  }

  // Debug para desarrollo
  debugForm() {
    console.log('📋 Form value:', this.productoForm.value);
    console.log('📋 Form valid:', this.productoForm.valid);
    console.log('📋 Form errors:', this.getFormErrors());
  }

  private getFormErrors() {
    const errors: any = {};
    Object.keys(this.productoForm.controls).forEach(key => {
      const control = this.productoForm.get(key);
      if (control?.errors) {
        errors[key] = control.errors;
      }
    });
    return errors;
  }
}