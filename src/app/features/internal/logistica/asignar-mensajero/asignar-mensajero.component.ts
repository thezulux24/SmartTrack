import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { EnvioService } from '../../../../shared/services/envio.service';
import { Mensajero, AsignacionEnvioDTO } from '../../../../shared/models/envio.model';

@Component({
  selector: 'app-asignar-mensajero',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './asignar-mensajero.component.html',
  styleUrl: './asignar-mensajero.component.css'
})
export class AsignarMensajeroComponent implements OnInit {
  private envioService = inject(EnvioService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // Señales
  kitId = signal<string>('');
  kitInfo = signal<any>(null);
  mensajeros = signal<Mensajero[]>([]);
  mensajeroSeleccionado = signal<Mensajero | null>(null);
  
  // Formulario - Pre-llenado desde base de datos
  direccionDestino = signal<string>('');
  contactoDestino = signal<string>('');
  telefonoDestino = signal<string>('');
  fechaProgramada = signal<string>('');
  observaciones = signal<string>('');

  cargando = signal<boolean>(false);
  error = signal<string>('');
  exito = signal<string>('');

  // Computed: mensajeros ordenados por nombre
  mensajerosFiltrados = computed(() => {
    return this.mensajeros().sort((a, b) => a.nombre.localeCompare(b.nombre));
  });

  ngOnInit() {
    // Obtener el kit_id de la ruta
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.kitId.set(id);
      this.cargarDatos();
    }

    // Establecer fecha por defecto (mañana)
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    this.fechaProgramada.set(manana.toISOString().split('T')[0]);
  }

  async cargarDatos() {
    try {
      this.cargando.set(true);

      // Cargar mensajeros disponibles
      this.envioService.getMensajerosDisponibles().subscribe({
        next: (mensajeros) => {
          this.mensajeros.set(mensajeros);
          this.cargando.set(false);
        },
        error: (err) => {
          console.error('Error cargando mensajeros:', err);
          this.error.set('Error al cargar mensajeros');
          this.cargando.set(false);
        }
      });

      // Cargar info del kit
      this.envioService.getKitsListosParaEnvio().subscribe({
        next: (kits) => {
          const kit = kits.find(k => k.id === this.kitId());
          
          if (kit) {
            this.kitInfo.set(kit);
            
            // Pre-llenar datos del hospital
            const hospital = kit.cirugia?.hospitales || kit.cirugia?.hospital;
            if (hospital) {
              this.direccionDestino.set(hospital.direccion || '');
            }
            
            // Pre-llenar contacto y teléfono del cliente
            const cliente = kit.cirugia?.clientes || kit.cirugia?.cliente;
            if (cliente) {
              const nombreCompleto = `${cliente.nombre} ${cliente.apellido}`;
              this.contactoDestino.set(nombreCompleto);
              this.telefonoDestino.set(cliente.telefono || '');
            }

          } else {
            console.error('Kit no encontrado con ID:', this.kitId());
          }
        },
        error: (err) => {
          console.error('Error cargando kit:', err);
        }
      });

    } catch (err) {
      console.error('Error:', err);
      this.error.set('Error al cargar datos');
      this.cargando.set(false);
    }
  }

  seleccionarMensajero(mensajero: Mensajero) {
    this.mensajeroSeleccionado.set(mensajero);
  }

  async asignarYDespachar() {
    // Validar
    if (!this.mensajeroSeleccionado()) {
      this.error.set('Debe seleccionar un mensajero');
      return;
    }

    if (!this.direccionDestino() || !this.fechaProgramada() || !this.contactoDestino() || !this.telefonoDestino()) {
      this.error.set('Complete todos los campos obligatorios (dirección, contacto, teléfono y fecha)');
      return;
    }

    try {
      this.cargando.set(true);
      this.error.set('');

      const datos: AsignacionEnvioDTO = {
        kit_id: this.kitId(),
        mensajero_id: this.mensajeroSeleccionado()!.id,
        direccion_destino: this.direccionDestino(),
        contacto_destino: this.contactoDestino(),
        telefono_destino: this.telefonoDestino(),
        fecha_programada: this.fechaProgramada(),
        observaciones: this.observaciones()
      };

      const resultado = await this.envioService.asignarMensajero(datos);

      if (resultado.exito) {
        this.exito.set(resultado.mensaje || 'Mensajero asignado exitosamente');
        
        // Redirigir después de 2 segundos
        setTimeout(() => {
          this.router.navigate(['/internal/logistica/kits-listos']);
        }, 2000);
      } else {
        this.error.set(resultado.mensaje || 'Error al asignar mensajero');
      }

    } catch (err) {
      console.error('Error:', err);
      this.error.set('Error al procesar la asignación');
    } finally {
      this.cargando.set(false);
    }
  }

  cancelar() {
    this.router.navigate(['/internal/logistica/kits-listos']);
  }
}
