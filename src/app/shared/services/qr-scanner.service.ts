import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class QrScannerService {
  private readonly scanResult = new BehaviorSubject<string | null>(null);
  private readonly isScanning = new BehaviorSubject<boolean>(false);

  public scanResult$ = this.scanResult.asObservable();
  public isScanning$ = this.isScanning.asObservable();

  constructor() { }

  /**
   * Generar código QR como string
   */
  generarQrString(data: any): string {
    return JSON.stringify(data);
  }

  /**
   * Iniciar escaneo de QR
   */
  iniciarEscaneo(): void {
    this.isScanning.next(true);
  }

  /**
   * Detener escaneo de QR
   */
  detenerEscaneo(): void {
    this.isScanning.next(false);
  }

  /**
   * Procesar resultado de escaneo
   */
  procesarEscaneo(resultado: string): void {
    this.scanResult.next(resultado);
    this.detenerEscaneo();
  }

  /**
   * Limpiar resultado de escaneo
   */
  limpiarResultado(): void {
    this.scanResult.next(null);
  }

  /**
   * Validar formato de QR de kit
   */
  validarQrKit(codigo: string): boolean {
    // Validar que el código tenga el formato correcto
    return codigo.startsWith('KIT-') && codigo.length > 10;
  }

  /**
   * Extraer información básica del código QR
   */
  extraerInfoQr(codigo: string): { tipo: string; timestamp?: number; id?: string } {
    try {
      if (codigo.startsWith('KIT-')) {
        const parts = codigo.split('-');
        return {
          tipo: 'kit',
          timestamp: parseInt(parts[1]),
          id: parts[2]
        };
      }
      
      // Intentar parsear como JSON
      const data = JSON.parse(codigo);
      return data;
    } catch {
      return { tipo: 'unknown' };
    }
  }
}