import { Component, OnInit, inject, signal, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { HojaGastoService } from '../data-access/hoja-gasto.service';
import { CirugiasService } from '../../agenda/data-access/cirugias.service';
import { 
  HojaGasto, 
  HojaGastoItem, 
  CreateHojaGastoRequest, 
  UpdateHojaGastoRequest, 
  EstadoHojaGasto, 
  CategoriaProducto,
  ESTADOS_CONFIG,
  CATEGORIAS_CONFIG
} from '../data-access/hoja-gasto.model';

interface CirugiaOption {
  id: string;
  numero_cirugia: string;
  fecha_cirugia: string;
  tecnico_asignado_id?: string; // UUID del técnico asignado
  cliente: {
    nombre: string;
    apellido: string;
  };
  tecnico: {
    nombre: string;
    apellido: string;
  };
  kit: {
    nombre: string;
    items: Array<{
      id: string;
      nombre: string;
      categoria: CategoriaProducto;
      precio: number;
      cantidad_requerida: number;
    }>;
  };
}

@Component({
  selector: 'app-hoja-gasto-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './hoja-gasto-form.component.html',
  styleUrl: './hoja-gasto-form.component.css'
})
export class HojaGastoFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private hojaGastoService = inject(HojaGastoService);
  private cirugiasService = inject(CirugiasService);

  // Signals para el estado del componente
  loading = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);
  hojaGasto = signal<HojaGasto | null>(null);
  cirugias = signal<CirugiaOption[]>([]);
  kitItems = signal<Array<{ id: string; nombre: string; categoria: CategoriaProducto; precio: number; cantidad_requerida: number }>>([]);

  // Computadas
  isEditMode = computed(() => !!this.hojaGasto() || !!this.route.snapshot.paramMap.get('id'));
  pageTitle = computed(() => this.isEditMode() ? 'Editar Hoja de Gasto' : 'Nueva Hoja de Gasto');
  submitButtonText = computed(() => this.isEditMode() ? 'Actualizar Hoja' : 'Crear Hoja');

  // Formulario reactivo
  form: FormGroup;

  // Configuraciones para templates
  readonly ESTADOS_CONFIG = ESTADOS_CONFIG;
  readonly CATEGORIAS_CONFIG = CATEGORIAS_CONFIG;

  constructor() {
    this.form = this.fb.group({
      cirugiaId: ['', Validators.required],
      observaciones: [''],
      items: this.fb.array([])
    });
  }

  ngOnInit() {
    this.loadData();
  }

  get itemsFormArray() {
    return this.form.get('items') as FormArray;
  }

  async loadData() {
    this.loading.set(true);
    this.error.set(null);

    try {
      // Obtener el ID de la hoja de la ruta si existe
      const hojaIdFromRoute = this.route.snapshot.paramMap.get('id');
      console.log('📋 ID de hoja desde ruta:', hojaIdFromRoute);
      console.log('📋 isEditMode:', this.isEditMode());
      
      // Si es modo edición, cargar la hoja de gasto PRIMERO
      if (hojaIdFromRoute) {
        console.log('🔄 MODO EDICIÓN: Cargando hoja de gasto...');
        
        // Esperar a que se cargue la hoja de gasto antes de cargar cirugías
        const hoja = await firstValueFrom(this.hojaGastoService.getHojaGasto(hojaIdFromRoute));
        
        if (hoja) {
          console.log('✅ Hoja de gasto cargada:', hoja);
          this.hojaGasto.set(hoja);
          this.populateForm(hoja);
        } else {
          console.error('❌ No se encontró la hoja de gasto');
          this.error.set('No se encontró la hoja de gasto');
          return;
        }
      } else {
        console.log('🆕 MODO CREACIÓN: Nueva hoja de gasto');
      }

      // Cargar cirugías disponibles DESPUÉS de cargar la hoja (si existe)
      await this.loadCirugias();

    } catch (error) {
      console.error('Error cargando datos:', error);
      this.error.set('Error al cargar los datos. Por favor, inténtelo de nuevo.');
    } finally {
      this.loading.set(false);
    }
  }

  private async loadCirugias() {
    try {
      console.log('🔄 Cargando cirugías con kits desde la base de datos...');
      
      // Usar el servicio real para obtener cirugías con sus kits y productos
      const cirugias = await firstValueFrom(this.cirugiasService.getCirugiasConKits());
      
      console.log('✅ Cirugías cargadas:', cirugias.length, cirugias);
      console.log('🔍 Modo edición:', this.isEditMode(), 'Hoja actual:', this.hojaGasto()?.id);

      // Si NO estamos en modo edición, filtrar cirugías que ya tienen hoja de gasto
      if (!this.isEditMode()) {
        console.log('🔍 Modo CREACIÓN: Filtrando cirugías que ya tienen hojas de gasto...');
        
        // Obtener todas las hojas de gasto existentes
        const hojasExistentes = await firstValueFrom(this.hojaGastoService.getHojasGasto({}));
        const cirugiasConHoja = new Set(hojasExistentes.map(h => h.cirugia_id));
        
        console.log('📋 Cirugías que ya tienen hoja de gasto:', Array.from(cirugiasConHoja));
        
        // Filtrar solo cirugías sin hoja de gasto
        const cirugiasDisponibles = cirugias.filter(c => !cirugiasConHoja.has(c.id));
        
        console.log('✅ Cirugías disponibles (sin hoja de gasto):', cirugiasDisponibles.length);
        
        this.cirugias.set(cirugiasDisponibles);
        
        if (cirugiasDisponibles.length === 0) {
          console.warn('⚠️ No hay cirugías disponibles sin hoja de gasto');
          this.error.set('No hay cirugías disponibles. Todas las cirugías completadas ya tienen una hoja de gasto asignada.');
        }
      } else {
        // En modo edición, mostrar todas las cirugías
        console.log('✅ Modo EDICIÓN: Mostrando todas las cirugías');
        this.cirugias.set(cirugias);
        
        if (cirugias.length === 0) {
          console.warn('⚠️ No se encontraron cirugías con kits');
          this.error.set('No hay cirugías con kits disponibles.');
        }
      }
      
    } catch (error) {
      console.error('❌ Error cargando cirugías con kits:', error);
      this.error.set('Error al cargar las cirugías disponibles. Por favor, inténtelo de nuevo.');
    }
  }

  private populateForm(hoja: HojaGasto) {
    this.form.patchValue({
      cirugiaId: hoja.cirugia_id,
      observaciones: hoja.observaciones || ''
    });

    // Limpiar y repoblar el FormArray de items
    while (this.itemsFormArray.length !== 0) {
      this.itemsFormArray.removeAt(0);
    }

    const items = hoja.items || hoja.hoja_gasto_items || [];
    items.forEach((item: HojaGastoItem) => {
      this.itemsFormArray.push(this.createItemFormGroup(item));
    });
  }

  onCirugiaChange(cirugiaId: string) {
    const cirugia = this.cirugias().find(c => c.id === cirugiaId);
    if (cirugia) {
      this.kitItems.set(cirugia.kit.items);
      this.populateItemsFromKit(cirugia.kit.items);
    }
  }

  private populateItemsFromKit(kitItems: Array<{ id: string; nombre: string; categoria: CategoriaProducto; precio: number; cantidad_requerida: number }>) {
    // Limpiar items existentes
    while (this.itemsFormArray.length !== 0) {
      this.itemsFormArray.removeAt(0);
    }

    // Agregar items del kit seleccionado
    kitItems.forEach(kitItem => {
      const hojaGastoItem: Partial<HojaGastoItem> = {
        descripcion: kitItem.nombre,
        categoria: kitItem.categoria,
        cantidad: kitItem.cantidad_requerida,
        precio_unitario: kitItem.precio,
        precio_total: kitItem.cantidad_requerida * kitItem.precio,
        observaciones: ''
      };

      this.itemsFormArray.push(this.createItemFormGroup(hojaGastoItem));
    });
  }

  private createItemFormGroup(item?: Partial<HojaGastoItem>): FormGroup {
    const descripcion = item?.descripcion || item?.nombre_producto || '';
    const cantidad = item?.cantidad || item?.cantidad_usada || 1;
    const precioTotal = item?.precio_total || item?.subtotal || 0;
    
    return this.fb.group({
      descripcion: [descripcion, Validators.required],
      categoria: [item?.categoria || 'productos', Validators.required],
      cantidad: [cantidad, [Validators.required, Validators.min(0)]],
      precio_unitario: [item?.precio_unitario || 0, [Validators.required, Validators.min(0)]],
      precio_total: [{ value: precioTotal, disabled: true }],
      observaciones: [item?.observaciones || '']
    });
  }

  addItem() {
    this.itemsFormArray.push(this.createItemFormGroup());
  }

  removeItem(index: number) {
    this.itemsFormArray.removeAt(index);
  }

  onItemQuantityOrPriceChange(index: number) {
    const itemGroup = this.itemsFormArray.at(index) as FormGroup;
    const cantidad = itemGroup.get('cantidad')?.value || 0;
    const precio = itemGroup.get('precio_unitario')?.value || 0;
    const precioTotal = cantidad * precio;
    
    itemGroup.get('precio_total')?.setValue(precioTotal);
  }

  calculateTotal(): number {
    return this.itemsFormArray.controls.reduce((total, control) => {
      const precioTotal = control.get('precio_total')?.value || 0;
      return total + precioTotal;
    }, 0);
  }

  calculateTotalByCategory(categoria: CategoriaProducto): number {
    return this.itemsFormArray.controls.reduce((total, control) => {
      if (control.get('categoria')?.value === categoria) {
        const precioTotal = control.get('precio_total')?.value || 0;
        return total + precioTotal;
      }
      return total;
    }, 0);
  }

  async onSubmit() {
    if (this.form.invalid) {
      this.markFormGroupTouched(this.form);
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    try {
      const formValue = this.form.value;
      const cirugia = this.cirugias().find(c => c.id === formValue.cirugiaId);
      const tecnicoId = cirugia?.tecnico ? '1' : '1'; // TODO: obtener del usuario actual
      
      const items = formValue.items.map((item: any) => ({
        producto_id: null, // Temporalmente null hasta que implementemos productos reales
        categoria: item.categoria,
        descripcion: item.descripcion,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        precio_total: item.cantidad * item.precio_unitario,
        observaciones: item.observaciones || undefined
      }));

      if (this.isEditMode() && this.hojaGasto()) {
        // Actualizar hoja existente
        const updateRequest: UpdateHojaGastoRequest = {
          observaciones: formValue.observaciones,
          items
        };

        this.hojaGastoService.updateHojaGasto(this.hojaGasto()!.id, updateRequest).subscribe({
          next: () => {
            console.log('✅ Hoja actualizada correctamente');
            this.saving.set(false);
            this.router.navigate(['/internal/hojas-gasto']);
          },
          error: (error: any) => {
            console.error('❌ Error actualizando hoja de gasto:', error);
            this.error.set('Error al actualizar la hoja de gasto: ' + (error.message || 'Error desconocido'));
            this.saving.set(false);
          }
        });
      } else {
        // Crear nueva hoja
        const cirugia = this.cirugias().find(c => c.id === formValue.cirugiaId);
        
        if (!cirugia?.tecnico_asignado_id) {
          console.error('❌ La cirugía seleccionada no tiene técnico asignado');
          this.error.set('La cirugía seleccionada no tiene técnico asignado');
          return;
        }
        
        const createRequest: CreateHojaGastoRequest = {
          cirugia_id: formValue.cirugiaId,
          tecnico_id: cirugia.tecnico_asignado_id, // Usar el UUID del técnico de la cirugía
          fecha_cirugia: cirugia.fecha_cirugia,
          observaciones: formValue.observaciones,
          items
        };

        console.log('📤 Enviando createRequest:', createRequest);

        this.hojaGastoService.createHojaGasto(createRequest).subscribe({
          next: (response) => {
            console.log('✅ Hoja creada:', response);
            this.router.navigate(['/internal/hojas-gasto']);
            this.saving.set(false);
          },
          error: (error: any) => {
            console.error('❌ Error creando hoja de gasto:', error);
            console.error('📋 Detalle completo:', JSON.stringify(error, null, 2));
            
            // Mostrar mensaje específico si es una hoja duplicada
            let errorMessage = 'Error al crear la hoja de gasto';
            if (error.message && error.message.includes('Ya existe una hoja de gasto')) {
              errorMessage = error.message;
            } else if (error.message) {
              errorMessage += ': ' + error.message;
            }
            
            this.error.set(errorMessage);
            this.saving.set(false);
          }
        });
        return; // No continuar con el código de abajo
      }

    } catch (error) {
      console.error('Error guardando hoja de gasto:', error);
      this.error.set('Error al guardar la hoja de gasto. Por favor, inténtelo de nuevo.');
      this.saving.set(false);
    }
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      } else if (control instanceof FormArray) {
        control.controls.forEach(arrayControl => {
          if (arrayControl instanceof FormGroup) {
            this.markFormGroupTouched(arrayControl);
          }
        });
      }
    });
  }

  volver() {
    this.router.navigate(['/internal/hojas-gasto']);
  }

  // Métodos de utilidad para templates
  getEstadoInfo(estado: EstadoHojaGasto) {
    return ESTADOS_CONFIG[estado] || { label: estado, color: 'bg-gray-100 text-gray-800', descripcion: '' };
  }

  getCategoriaInfo(categoria: CategoriaProducto) {
    return CATEGORIAS_CONFIG[categoria] || { label: categoria, color: 'text-gray-600', icon: '' };
  }

  formatMoneda(valor: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP'
    }).format(valor);
  }
}