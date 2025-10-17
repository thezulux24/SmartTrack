import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SupabaseService } from '../../../../shared/data-access/supabase.service';

interface MetricasComercial {
  // Cotizaciones
  totalCotizaciones: number;
  cotizacionesAprobadas: number;
  cotizacionesPendientes: number;
  cotizacionesRechazadas: number;
  tasaConversion: number;
  
  // Cirugías
  totalCirugias: number;
  cirugiasCompletadas: number;
  cirugiasPendientes: number;
  
  // Hojas de Gasto (Facturación)
  totalHojasGasto: number;
  hojasFacturadas: number; // estado = 'aprobada'
  hojasPendientes: number;
  totalFacturado: number;
  
  // Clientes
  totalClientes: number;
  clientesActivos: number;
  
  // Tendencias mensuales
  cotizacionesMesActual: number;
  cotizacionesMesAnterior: number;
  facturacionMesActual: number;
  facturacionMesAnterior: number;
  
  // Para el acelerómetro
  hojasFacturadasMesActual: number; // Hojas facturadas solo del mes actual
}

interface FraseMotivacional {
  texto: string;
  autor: string;
}

@Component({
  selector: 'app-comercial-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './comercial-dashboard.component.html',
  styleUrl: './comercial-dashboard.component.css'
})
export default class ComercialDashboardComponent implements OnInit {
  private router = inject(Router);
  private supabase = inject(SupabaseService);

  // Exponer Math para usar en el template
  Math = Math;

  loading = signal(true);
  error = signal<string | null>(null);
  metricas = signal<MetricasComercial>({
    totalCotizaciones: 0,
    cotizacionesAprobadas: 0,
    cotizacionesPendientes: 0,
    cotizacionesRechazadas: 0,
    tasaConversion: 0,
    totalCirugias: 0,
    cirugiasCompletadas: 0,
    cirugiasPendientes: 0,
    totalHojasGasto: 0,
    hojasFacturadas: 0,
    hojasPendientes: 0,
    totalFacturado: 0,
    totalClientes: 0,
    clientesActivos: 0,
    cotizacionesMesActual: 0,
    cotizacionesMesAnterior: 0,
    facturacionMesActual: 0,
    facturacionMesAnterior: 0,
    hojasFacturadasMesActual: 0
  });

  fraseDelDia = signal<FraseMotivacional>({
    texto: '',
    autor: ''
  });

  currentUserId = signal<string | null>(null);
  nombreUsuario = signal<string>('Comercial');

  private frases: FraseMotivacional[] = [
    { texto: 'El éxito es la suma de pequeños esfuerzos repetidos día tras día.', autor: 'Robert Collier' },
    { texto: 'La diferencia entre lo ordinario y lo extraordinario es ese pequeño extra.', autor: 'Jimmy Johnson' },
    { texto: 'No cuentes los días, haz que los días cuenten.', autor: 'Muhammad Ali' },
    { texto: 'El vendedor exitoso no es quien espera oportunidades, sino quien las crea.', autor: 'Anónimo' },
    { texto: 'Cada cliente satisfecho es un nuevo vendedor de tu marca.', autor: 'Anónimo' },
    { texto: 'La persistencia es el camino del éxito.', autor: 'Charles Chaplin' },
    { texto: 'Las ventas no se logran por suerte, se logran con trabajo y dedicación.', autor: 'Anónimo' },
    { texto: 'Tu actitud determina tu altitud en las ventas.', autor: 'Zig Ziglar' },
    { texto: 'No vendas productos, vende soluciones.', autor: 'Anónimo' },
    { texto: 'El éxito en las ventas comienza con una mentalidad positiva.', autor: 'Brian Tracy' },
    { texto: 'Cada "no" te acerca un paso más al "sí".', autor: 'Anónimo' },
    { texto: 'La excelencia no es un acto, es un hábito.', autor: 'Aristóteles' },
    { texto: 'Tus clientes más insatisfechos son tu mayor fuente de aprendizaje.', autor: 'Bill Gates' },
    { texto: 'El mejor vendedor es aquel que escucha más de lo que habla.', autor: 'Anónimo' },
    { texto: 'Haz de cada venta una experiencia memorable.', autor: 'Anónimo' }
  ];

  async ngOnInit() {
    this.seleccionarFraseAleatoria();
    await this.cargarDatosUsuario();
    await this.cargarMetricas(); // Cargar métricas automáticamente al entrar
  }

  seleccionarFraseAleatoria() {
    const indice = Math.floor(Math.random() * this.frases.length);
    this.fraseDelDia.set(this.frases[indice]);
  }

  async cargarDatosUsuario() {
    try {
      const session = await this.supabase.getSession();
      if (session?.user?.id) {
        this.currentUserId.set(session.user.id);
        
        const { data: profile } = await this.supabase.client
          .from('profiles')
          .select('full_name')
          .eq('id', session.user.id)
          .single();
        
        if (profile?.full_name) {
          this.nombreUsuario.set(profile.full_name);
        }
      }
    } catch (error) {
      console.error('Error cargando datos de usuario:', error);
    }
  }

  async cargarMetricas() {
    try {
      this.loading.set(true);
      this.error.set(null);

      const userId = this.currentUserId();
      if (!userId) {
        throw new Error('Usuario no autenticado');
      }

      // Obtener fechas para filtros
      const hoy = new Date();
      const inicioMesActual = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      const inicioMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
      const finMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth(), 0);

      // Ejecutar queries en paralelo para mejor rendimiento
      const [
        cotizaciones,
        cirugias,
        hojasGasto,
        clientes,
        cotizacionesMesActual,
        cotizacionesMesAnterior,
        hojasGastoMesActual,
        hojasGastoMesAnterior
      ] = await Promise.all([
        // Cotizaciones del usuario
        this.supabase.client
          .from('cotizaciones')
          .select('id, estado, total')
          .eq('created_by', userId),
        
        // Cirugías del usuario
        this.supabase.client
          .from('cirugias')
          .select('id, estado')
          .eq('usuario_creador_id', userId),
        
        // Hojas de gasto (facturación)
        this.supabase.client
          .from('hojas_gasto')
          .select('id, estado, total_general, created_at'),
        
        // Clientes totales
        this.supabase.client
          .from('clientes')
          .select('id, estado'),
        
        // Cotizaciones mes actual
        this.supabase.client
          .from('cotizaciones')
          .select('id')
          .eq('created_by', userId)
          .gte('created_at', inicioMesActual.toISOString()),
        
        // Cotizaciones mes anterior
        this.supabase.client
          .from('cotizaciones')
          .select('id')
          .eq('created_by', userId)
          .gte('created_at', inicioMesAnterior.toISOString())
          .lte('created_at', finMesAnterior.toISOString()),
        
        // Hojas de gasto mes actual
        this.supabase.client
          .from('hojas_gasto')
          .select('total_general')
          .eq('estado', 'aprobada')
          .gte('created_at', inicioMesActual.toISOString()),
        
        // Hojas de gasto mes anterior
        this.supabase.client
          .from('hojas_gasto')
          .select('total_general')
          .eq('estado', 'aprobada')
          .gte('created_at', inicioMesAnterior.toISOString())
          .lte('created_at', finMesAnterior.toISOString())
      ]);

      // Procesar cotizaciones
      const totalCotizaciones = cotizaciones.data?.length || 0;
      const cotizacionesAprobadas = cotizaciones.data?.filter(c => c.estado === 'aprobada').length || 0;
      const cotizacionesPendientes = cotizaciones.data?.filter(c => ['borrador', 'enviada', 'revision'].includes(c.estado)).length || 0;
      const cotizacionesRechazadas = cotizaciones.data?.filter(c => c.estado === 'rechazada').length || 0;
      const tasaConversion = totalCotizaciones > 0 ? (cotizacionesAprobadas / totalCotizaciones) * 100 : 0;

      // Procesar cirugías
      const totalCirugias = cirugias.data?.length || 0;
      const cirugiasCompletadas = cirugias.data?.filter(c => c.estado === 'completada').length || 0;
      const cirugiasPendientes = cirugias.data?.filter(c => ['programada', 'en_curso'].includes(c.estado)).length || 0;

      // Procesar hojas de gasto (FACTURACIÓN)
      const totalHojasGasto = hojasGasto.data?.length || 0;
      const hojasFacturadas = hojasGasto.data?.filter(h => h.estado === 'aprobada').length || 0;
      const hojasPendientes = hojasGasto.data?.filter(h => ['borrador', 'revision'].includes(h.estado)).length || 0;
      const totalFacturado = hojasGasto.data
        ?.filter(h => h.estado === 'aprobada')
        .reduce((sum, h) => sum + (h.total_general || 0), 0) || 0;

      // Procesar clientes
      const totalClientes = clientes.data?.length || 0;
      const clientesActivos = clientes.data?.filter(c => c.estado === 'activo').length || 0;

      // Tendencias mensuales
      const cotizacionesMesAct = cotizacionesMesActual.data?.length || 0;
      const cotizacionesMesAnt = cotizacionesMesAnterior.data?.length || 0;
      const facturacionMesAct = hojasGastoMesActual.data?.reduce((sum, h) => sum + (h.total_general || 0), 0) || 0;
      const facturacionMesAnt = hojasGastoMesAnterior.data?.reduce((sum, h) => sum + (h.total_general || 0), 0) || 0;
      
      // Para el acelerómetro: contar hojas facturadas del mes actual
      const hojasFacturadasMesAct = hojasGastoMesActual.data?.length || 0; // Ya vienen filtradas con estado='aprobada'

      // Actualizar métricas
      this.metricas.set({
        totalCotizaciones,
        cotizacionesAprobadas,
        cotizacionesPendientes,
        cotizacionesRechazadas,
        tasaConversion,
        totalCirugias,
        cirugiasCompletadas,
        cirugiasPendientes,
        totalHojasGasto,
        hojasFacturadas,
        hojasPendientes,
        totalFacturado,
        totalClientes,
        clientesActivos,
        cotizacionesMesActual: cotizacionesMesAct,
        cotizacionesMesAnterior: cotizacionesMesAnt,
        facturacionMesActual: facturacionMesAct,
        facturacionMesAnterior: facturacionMesAnt,
        hojasFacturadasMesActual: hojasFacturadasMesAct
      });

    } catch (err: any) {
      console.error('Error cargando métricas:', err);
      this.error.set('Error al cargar las métricas. Intente nuevamente.');
    } finally {
      this.loading.set(false);
    }
  }

  formatMoneda(valor: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(valor);
  }

  formatPorcentaje(valor: number): string {
    return `${valor.toFixed(1)}%`;
  }

  calcularTendencia(actual: number, anterior: number): { valor: number; esPositivo: boolean } {
    if (anterior === 0) {
      return { valor: actual > 0 ? 100 : 0, esPositivo: actual > 0 };
    }
    const cambio = ((actual - anterior) / anterior) * 100;
    return { valor: Math.abs(cambio), esPositivo: cambio >= 0 };
  }

  // Métodos para el acelerómetro
  getNeedleRotation(): number {
    const facturadas = this.metricas().hojasFacturadasMesActual;
    const porcentaje = Math.min((facturadas / 10) * 100, 110);
    // Convertir porcentaje a grados: 0% = -90° (izquierda), 100% = 90° (derecha)
    return (porcentaje * 1.8) - 90;
  }

  getNeedleColor(): string {
    const facturadas = this.metricas().hojasFacturadasMesActual;
    if (facturadas >= 10) return '#22c55e'; // green-500
    if (facturadas >= 7) return '#C8D900'; // lime
    if (facturadas >= 4) return '#facc15'; // yellow-400
    return '#ef4444'; // red-500
  }

  navegarCotizaciones() {
    this.router.navigate(['/internal/cotizaciones']);
  }

  navegarHojasGasto() {
    this.router.navigate(['/internal/hojas-gasto']);
  }

  navegarClientes() {
    this.router.navigate(['/internal/clientes']);
  }

  navegarAgenda() {
    this.router.navigate(['/internal/agenda']);
  }

  volver() {
    this.router.navigate(['/internal']);
  }
}
