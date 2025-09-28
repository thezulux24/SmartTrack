import { Component, OnInit, signal, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule} from '@angular/common';

import { CirugiasService } from '../data-access/cirugias.service';
import { HospitalesService } from '../data-access/hospitales.service';
import { TiposCirugiaService } from '../data-access/tipos-cirugia.service';
import { TecnicosService } from '../data-access/tecnicos.service';
import { KitService } from '../../../../shared/services/kit.service';
import { Hospital, TipoCirugia, TecnicoAsignado, Cirugia, CirugiaCreate } from '../data-access/models';

@Component({
  selector: 'app-cirugia-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './cirugia-form.component.html',
  styleUrl: './cirugia-form.component.css'
})
export class CirugiaFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly cirugiasService = inject(CirugiasService);
  private readonly hospitalesService = inject(HospitalesService);
  private readonly tiposCirugiaService = inject(TiposCirugiaService);
  private readonly tecnicosService = inject(TecnicosService);
  private readonly kitService = inject(KitService);

  // Signals
  loading = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);
  cirugiaCreada = signal<Cirugia | null>(null);
  cirugiaEditada = signal<Cirugia | null>(null);
  tieneKit = signal<boolean>(false);
  
  // Data signals
  hospitales = signal<Hospital[]>([]);
  tiposCirugia = signal<TipoCirugia[]>([]);
  tecnicos = signal<TecnicoAsignado[]>([]);
  
  // Form
  cirugiaForm: FormGroup;
  isEditing = false;
  cirugiaId: string | null = null;

  // Options
  estadosOptions = [
    { value: 'programada', label: 'Programada' },
    { value: 'en_curso', label: 'En Curso' },
    { value: 'completada', label: 'Completada' },
    { value: 'cancelada', label: 'Cancelada' },
    { value: 'urgencia', label: 'Urgencia' }
  ];

  prioridadOptions = [
    { value: 'baja', label: 'Baja' },
    { value: 'normal', label: 'Normal' },
    { value: 'alta', label: 'Alta' },
    { value: 'urgencia', label: 'Urgencia' }
  ];

  constructor() {
    this.cirugiaForm = this.fb.group({
      // Información del paciente
      paciente_nombre: ['', [Validators.required, Validators.minLength(2)]],
      paciente_documento: [''],
      paciente_telefono: [''],
      
      // Información de la cirugía
      hospital_id: ['', Validators.required],
      tipo_cirugia_id: ['', Validators.required],
      medico_cirujano: ['', [Validators.required, Validators.minLength(2)]],
      
      // Programación
      fecha_programada: ['', Validators.required],
      hora_inicio: [''],
      duracion_estimada: [null, [Validators.min(15)]],
      
      // Estado y prioridad
      estado: ['programada', Validators.required],
      prioridad: ['normal', Validators.required],
      
      // Asignación
      tecnico_asignado_id: [''],
      
      // Observaciones
      notas: ['']
    });
  }

  ngOnInit() {
    console.log('🚀 CirugiaFormComponent iniciando...');
    this.loadInitialData();
    this.checkEditMode();
  }

  // ✅ Hacer el método público para que sea accesible desde el template
  loadInitialData() {
    console.log('📊 Cargando datos iniciales...');
    this.loading.set(true);
    this.error.set(null);
    
    // ✅ Cargar cada servicio por separado para identificar el problema
    console.log('🏥 Iniciando carga de hospitales...');
    this.hospitalesService.getHospitales().subscribe({
      next: (hospitales) => {
        console.log('✅ Hospitales cargados:', hospitales);
        this.hospitales.set(hospitales);
        
        console.log('⚕️ Iniciando carga de tipos de cirugía...');
        this.tiposCirugiaService.getTiposCirugia().subscribe({
          next: (tipos) => {
            console.log('✅ Tipos de cirugía cargados:', tipos);
            this.tiposCirugia.set(tipos);
            
            console.log('👨‍⚕️ Iniciando carga de técnicos...');
            this.tecnicosService.getTecnicos().subscribe({
              next: (tecnicos) => {
                console.log('✅ Técnicos cargados:', tecnicos);
                this.tecnicos.set(tecnicos);
                this.loading.set(false);
              },
              error: (err) => {
                console.error('❌ Error loading tecnicos:', err);
                console.error('❌ Error details:', {
                  message: err?.message,
                  code: err?.code,
                  details: err?.details,
                  hint: err?.hint
                });
                this.error.set('Error al cargar técnicos: ' + (err?.message || JSON.stringify(err)));
                this.loading.set(false);
              }
            });
          },
          error: (err) => {
            console.error('❌ Error loading tipos cirugia:', err);
            console.error('❌ Error details:', {
              message: err?.message,
              code: err?.code,
              details: err?.details,
              hint: err?.hint
            });
            this.error.set('Error al cargar tipos de cirugía: ' + (err?.message || JSON.stringify(err)));
            this.loading.set(false);
          }
        });
      },
      error: (err) => {
        console.error('❌ Error loading hospitales:', err);
        console.error('❌ Error details:', {
          message: err?.message,
          code: err?.code,
          details: err?.details,
          hint: err?.hint
        });
        this.error.set('Error al cargar hospitales: ' + (err?.message || JSON.stringify(err)));
        this.loading.set(false);
      }
    });
  }

  private checkEditMode() {
    this.cirugiaId = this.route.snapshot.paramMap.get('id');
    if (this.cirugiaId) {
      this.isEditing = true;
      this.loadCirugia();
    }
  }

  private loadCirugia() {
    if (!this.cirugiaId) return;
    
    console.log('📋 Cargando cirugía para edición:', this.cirugiaId);
    this.loading.set(true);
    this.cirugiasService.getCirugiaById(this.cirugiaId).subscribe({
      next: (cirugia) => {
        console.log('✅ Cirugía cargada:', cirugia);
        this.populateForm(cirugia);
        this.cirugiaEditada.set(cirugia);
        if (this.cirugiaId) {
          this.verificarKit(this.cirugiaId);
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('❌ Error loading cirugia:', err);
        this.error.set('Error al cargar la cirugía: ' + (err?.message || err));
        this.loading.set(false);
      }
    });
  }

  private populateForm(cirugia: Cirugia) {
    // Convertir fecha a formato input
    const fechaFormateada = new Date(cirugia.fecha_programada).toISOString().split('T')[0];
    
    this.cirugiaForm.patchValue({
      paciente_nombre: cirugia.paciente_nombre,
      paciente_documento: cirugia.paciente_documento,
      paciente_telefono: cirugia.paciente_telefono,
      hospital_id: cirugia.hospital_id,
      tipo_cirugia_id: cirugia.tipo_cirugia_id,
      medico_cirujano: cirugia.medico_cirujano,
      fecha_programada: fechaFormateada,
      hora_inicio: cirugia.hora_inicio,
      duracion_estimada: cirugia.duracion_estimada,
      estado: cirugia.estado,
      prioridad: cirugia.prioridad,
      tecnico_asignado_id: cirugia.tecnico_asignado_id,
      notas: cirugia.notas
    });
  }

  onTipoCirugiaChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const tipoCirugiaId = target.value;
    
    console.log('🔄 Tipo de cirugía seleccionado:', tipoCirugiaId);
    
    const tipoSeleccionado = this.tiposCirugia().find(t => t.id === tipoCirugiaId);
    console.log('📋 Tipo encontrado:', tipoSeleccionado);
    
    if (tipoSeleccionado?.duracion_promedio) {
      console.log('⏱️ Actualizando duración estimada:', tipoSeleccionado.duracion_promedio);
      this.cirugiaForm.patchValue({
        duracion_estimada: tipoSeleccionado.duracion_promedio
      });
    }
  }

  onSubmit() {
    console.log('📝 Enviando formulario...');
    console.log('🔍 Form válido:', this.cirugiaForm.valid);
    console.log('📊 Form values:', this.cirugiaForm.value);
    console.log('❌ Form errors:', this.cirugiaForm.errors);

    if (this.cirugiaForm.invalid) {
      console.log('⚠️ Formulario inválido, marcando campos...');
      this.markFormGroupTouched();
      
      // Debug: Mostrar errores específicos
      Object.keys(this.cirugiaForm.controls).forEach(key => {
        const control = this.cirugiaForm.get(key);
        if (control?.errors) {
          console.log(`❌ Campo ${key} tiene errores:`, control.errors);
        }
      });
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const formData = this.cirugiaForm.value;
    
    // Generar número de cirugía si es nueva
    if (!this.isEditing) {
      formData.numero_cirugia = this.generateNumeroCirugia();
    }

    // Formatear fecha para la base de datos
    formData.fecha_programada = new Date(formData.fecha_programada).toISOString();

    console.log('💾 Datos a enviar:', formData);

    if (this.isEditing && this.cirugiaId) {
      this.updateCirugia(formData);
    } else {
      this.createCirugia(formData);
    }
  }

  private createCirugia(data: CirugiaCreate) {
    console.log('➕ Creando nueva cirugía...');
    this.cirugiasService.createCirugia(data).subscribe({
      next: (cirugia) => {
        console.log('✅ Cirugía creada exitosamente:', cirugia);
        this.success.set('Cirugía creada exitosamente');
        this.cirugiaCreada.set(cirugia);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('❌ Error creating cirugia:', err);
        this.error.set('Error al crear la cirugía: ' + (err?.message || err));
        this.loading.set(false);
      }
    });
  }

  private updateCirugia(data: Partial<Cirugia>) {
    if (!this.cirugiaId) return;
    
    console.log('📝 Actualizando cirugía...');
    this.cirugiasService.updateCirugia(this.cirugiaId, data).subscribe({
      next: (cirugia) => {
        console.log('✅ Cirugía actualizada exitosamente:', cirugia);
        this.success.set('Cirugía actualizada exitosamente');
        setTimeout(() => {
          this.router.navigate(['/internal/agenda']);
        }, 1500);
      },
      error: (err) => {
        console.error('❌ Error updating cirugia:', err);
        this.error.set('Error al actualizar la cirugía: ' + (err?.message || err));
        this.loading.set(false);
      }
    });
  }

  private generateNumeroCirugia(): string {
    const year = new Date().getFullYear();
    const timestamp = Date.now().toString().slice(-6);
    return `CIR-${year}-${timestamp}`;
  }

  private markFormGroupTouched() {
    Object.keys(this.cirugiaForm.controls).forEach(key => {
      const control = this.cirugiaForm.get(key);
      control?.markAsTouched();
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.cirugiaForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.cirugiaForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return `Este campo es requerido`;
      if (field.errors['minlength']) return `Debe tener al menos ${field.errors['minlength'].requiredLength} caracteres`;
      if (field.errors['min']) return `Debe ser mayor a ${field.errors['min'].min}`;
    }
    return '';
  }

  onCancel() {
    this.router.navigate(['/internal/agenda']);
  }

  private verificarKit(cirugiaId: string) {
    this.kitService.tieneKit(cirugiaId).subscribe({
      next: (tiene) => {
        this.tieneKit.set(tiene);
      },
      error: (err) => {
        console.error('Error verificando kit:', err);
        this.tieneKit.set(false);
      }
    });
  }

  onCrearKit() {
    const cirugia = this.cirugiaCreada() || this.cirugiaEditada();
    if (cirugia) {
      this.router.navigate(['/internal/agenda/kit-builder', cirugia.id]);
    }
  }

  onVolverAgenda() {
    this.router.navigate(['/internal/agenda']);
  }

  // ✅ Métodos de debug para el template
  debugHospitales() {
    console.log('🏥 Debug Hospitales:', this.hospitales());
  }

  debugTipos() {
    console.log('⚕️ Debug Tipos:', this.tiposCirugia());
  }

  debugTecnicos() {
    console.log('👨‍⚕️ Debug Técnicos:', this.tecnicos());
  }
}