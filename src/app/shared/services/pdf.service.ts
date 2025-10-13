import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Cotizacion } from '../models/cotizacion.model';

@Injectable({
  providedIn: 'root'
})
export class PdfService {

  /**
   * Genera un PDF profesional de la cotización
   */
  generarCotizacionPDF(cotizacion: Cotizacion): void {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPos = 20;

    // ============================================
    // HEADER - Logo y datos de la empresa
    // ============================================
    
    // Logo (opcional - si tienes el logo en base64)
    // doc.addImage(logoBase64, 'PNG', 15, yPos, 50, 15);
    
    // Nombre de la empresa
    doc.setFontSize(22);
    doc.setTextColor(16, 40, 76); // #10284C
    doc.setFont('helvetica', 'bold');
    doc.text('IMPLAMEQ', 15, yPos);
    
    yPos += 7;
    doc.setFontSize(9);
    doc.setTextColor(0, 152, 168); // #0098A8
    doc.setFont('helvetica', 'normal');
    doc.text('Implantes Médicos - Quirúrgicos', 15, yPos);
    
    // Datos de contacto de la empresa (alineados a la derecha)
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    const empresaInfo = [
      'www.implameq.com',
      'info@implameq.com',
      'Tel: +57 301 7311282',
      'Cl. 5b 2 #30-14, 3 de Julio',
      'Cali, Valle del Cauca, Colombia'
    ];
    
    let rightX = pageWidth - 15;
    let contactY = 20;
    empresaInfo.forEach(info => {
      doc.text(info, rightX, contactY, { align: 'right' });
      contactY += 4;
    });

    yPos += 15;

    // ============================================
    // TÍTULO - COTIZACIÓN
    // ============================================
    
    // Línea separadora
    doc.setDrawColor(0, 152, 168);
    doc.setLineWidth(0.5);
    doc.line(15, yPos, pageWidth - 15, yPos);
    
    yPos += 10;
    
    // Título Cotización y Número
    doc.setFontSize(18);
    doc.setTextColor(16, 40, 76);
    doc.setFont('helvetica', 'bold');
    doc.text('COTIZACIÓN', 15, yPos);
    
    doc.setFontSize(12);
    doc.setTextColor(0, 152, 168);
    doc.text(cotizacion.numero_cotizacion, pageWidth - 15, yPos, { align: 'right' });
    
    yPos += 8;

    // Estado de la cotización
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    const estadoColor = this.getEstadoColor(cotizacion.estado);
    doc.setTextColor(estadoColor.r, estadoColor.g, estadoColor.b);
    doc.text(`ESTADO: ${cotizacion.estado.toUpperCase()}`, pageWidth - 15, yPos, { align: 'right' });
    
    yPos += 10;

    // ============================================
    // INFORMACIÓN DEL CLIENTE Y FECHAS
    // ============================================
    
    // Cuadro de información del cliente (izquierda)
    doc.setFillColor(245, 247, 250);
    doc.rect(15, yPos, (pageWidth - 35) / 2, 35, 'F');
    
    doc.setFontSize(10);
    doc.setTextColor(16, 40, 76);
    doc.setFont('helvetica', 'bold');
    doc.text('CLIENTE', 20, yPos + 6);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    
    const clienteNombre = `${cotizacion.cliente?.nombre || ''} ${cotizacion.cliente?.apellido || ''}`.trim();
    doc.text(clienteNombre, 20, yPos + 12);
    
    if (cotizacion.cliente?.email) {
      doc.text(`Email: ${cotizacion.cliente.email}`, 20, yPos + 17);
    }
    
    if (cotizacion.cliente?.telefono) {
      doc.text(`Tel: ${cotizacion.cliente.telefono}`, 20, yPos + 22);
    }
    
    if (cotizacion.cliente?.ciudad) {
      doc.text(`Ciudad: ${cotizacion.cliente.ciudad}`, 20, yPos + 27);
    }

    // Cuadro de fechas (derecha)
    const rightBoxX = 15 + (pageWidth - 35) / 2 + 5;
    doc.setFillColor(245, 247, 250);
    doc.rect(rightBoxX, yPos, (pageWidth - 35) / 2, 35, 'F');
    
    doc.setFontSize(10);
    doc.setTextColor(16, 40, 76);
    doc.setFont('helvetica', 'bold');
    doc.text('FECHAS', rightBoxX + 5, yPos + 6);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    
    doc.text(`Emisión: ${this.formatDate(cotizacion.fecha_emision)}`, rightBoxX + 5, yPos + 12);
    doc.text(`Vencimiento: ${this.formatDate(cotizacion.fecha_vencimiento)}`, rightBoxX + 5, yPos + 17);
    
    if (cotizacion.fecha_aprobacion) {
      doc.text(`Aprobación: ${this.formatDate(cotizacion.fecha_aprobacion)}`, rightBoxX + 5, yPos + 22);
    }
    
    // Días de validez
    const diasValidez = this.calcularDiasValidez(cotizacion.fecha_emision, cotizacion.fecha_vencimiento);
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Válida por ${diasValidez} días`, rightBoxX + 5, yPos + 30);

    yPos += 45;

    // ============================================
    // TABLA DE PRODUCTOS/SERVICIOS
    // ============================================
    
    doc.setFontSize(11);
    doc.setTextColor(16, 40, 76);
    doc.setFont('helvetica', 'bold');
    doc.text('DETALLE DE PRODUCTOS Y SERVICIOS', 15, yPos);
    
    yPos += 5;

    // Preparar datos para la tabla
    const tableData = (cotizacion.items || []).map(item => [
      item.descripcion + (item.observaciones ? `\n${item.observaciones}` : ''),
      item.cantidad.toString(),
      this.formatMoney(item.precio_unitario),
      this.formatMoney(item.precio_total)
    ]);

    // Generar tabla
    autoTable(doc, {
      startY: yPos,
      head: [['Descripción', 'Cant.', 'Precio Unit.', 'Total']],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: [16, 40, 76], // #10284C
        textColor: [200, 217, 0], // #C8D900
        fontSize: 9,
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        0: { cellWidth: 90, halign: 'left' },
        1: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 35, halign: 'right' },
        3: { cellWidth: 35, halign: 'right' }
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [60, 60, 60]
      },
      alternateRowStyles: {
        fillColor: [250, 250, 250]
      },
      margin: { left: 15, right: 15 }
    });

    // Obtener posición Y después de la tabla
    yPos = (doc as any).lastAutoTable.finalY + 10;

    // ============================================
    // RESUMEN DE TOTALES
    // ============================================
    
    const totalesX = pageWidth - 75;
    
    // Cuadro de totales
    doc.setFillColor(245, 247, 250);
    doc.rect(totalesX - 5, yPos, 65, 35, 'F');
    
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.setFont('helvetica', 'normal');
    
    // Subtotal
    doc.text('Subtotal:', totalesX, yPos + 6);
    doc.text(this.formatMoney(cotizacion.subtotal), totalesX + 60, yPos + 6, { align: 'right' });
    
    yPos += 6;
    
    // Costo de transporte
    if (cotizacion.costo_transporte > 0) {
      doc.text('Transporte:', totalesX, yPos + 6);
      doc.text(this.formatMoney(cotizacion.costo_transporte), totalesX + 60, yPos + 6, { align: 'right' });
      yPos += 6;
    }
    
    // Descuento
    if (cotizacion.descuento > 0) {
      doc.setTextColor(220, 38, 38); // Rojo para descuento
      doc.text('Descuento:', totalesX, yPos + 6);
      doc.text(`-${this.formatMoney(cotizacion.descuento)}`, totalesX + 60, yPos + 6, { align: 'right' });
      yPos += 6;
    }
    
    // Línea separadora antes del total
    doc.setDrawColor(0, 152, 168);
    doc.setLineWidth(0.3);
    doc.line(totalesX, yPos + 8, totalesX + 60, yPos + 8);
    
    yPos += 10;
    
    // TOTAL
    doc.setFontSize(12);
    doc.setTextColor(16, 40, 76);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL:', totalesX, yPos + 6);
    
    doc.setFontSize(14);
    doc.setTextColor(0, 152, 168);
    doc.text(this.formatMoney(cotizacion.total), totalesX + 60, yPos + 6, { align: 'right' });
    
    yPos += 20;

    // ============================================
    // INFORMACIÓN ADICIONAL
    // ============================================
    
    // Información de cirugía (si existe)
    if (cotizacion.hospital_id || cotizacion.medico_cirujano) {
      // Verificar si hay espacio, sino nueva página
      if (yPos > pageHeight - 60) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(10);
      doc.setTextColor(16, 40, 76);
      doc.setFont('helvetica', 'bold');
      doc.text('INFORMACIÓN DE CIRUGÍA', 15, yPos);
      
      yPos += 6;
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      
      if (cotizacion.hospital?.nombre) {
        doc.text(`Hospital: ${cotizacion.hospital.nombre}`, 15, yPos);
        yPos += 5;
      }
      
      if (cotizacion.tipo_cirugia?.nombre) {
        doc.text(`Tipo de Cirugía: ${cotizacion.tipo_cirugia.nombre}`, 15, yPos);
        yPos += 5;
      }
      
      if (cotizacion.medico_cirujano) {
        doc.text(`Médico Cirujano: ${cotizacion.medico_cirujano}`, 15, yPos);
        yPos += 5;
      }
      
      if (cotizacion.fecha_programada) {
        doc.text(`Fecha Programada: ${this.formatDate(cotizacion.fecha_programada)}`, 15, yPos);
        yPos += 5;
      }
      
      yPos += 5;
    }

    // Observaciones
    if (cotizacion.observaciones) {
      // Verificar si hay espacio, sino nueva página
      if (yPos > pageHeight - 40) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(10);
      doc.setTextColor(16, 40, 76);
      doc.setFont('helvetica', 'bold');
      doc.text('OBSERVACIONES', 15, yPos);
      
      yPos += 6;
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      
      const observacionesLines = doc.splitTextToSize(cotizacion.observaciones, pageWidth - 30);
      doc.text(observacionesLines, 15, yPos);
      
      yPos += (observacionesLines.length * 4) + 5;
    }

    // Términos y Condiciones
    if (cotizacion.terminos_condiciones) {
      // Verificar si hay espacio, sino nueva página
      if (yPos > pageHeight - 50) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(10);
      doc.setTextColor(16, 40, 76);
      doc.setFont('helvetica', 'bold');
      doc.text('TÉRMINOS Y CONDICIONES', 15, yPos);
      
      yPos += 6;
      
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      
      const terminosLines = doc.splitTextToSize(cotizacion.terminos_condiciones, pageWidth - 30);
      doc.text(terminosLines, 15, yPos);
      
      yPos += (terminosLines.length * 3) + 10;
    }

    // ============================================
    // FOOTER
    // ============================================
    
    const totalPages = (doc as any).internal.getNumberOfPages();
    
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      
      // Línea superior del footer
      doc.setDrawColor(0, 152, 168);
      doc.setLineWidth(0.3);
      doc.line(15, pageHeight - 20, pageWidth - 15, pageHeight - 20);
      
      // Texto del footer
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      doc.setFont('helvetica', 'italic');
      
      const footerText = 'Implameq - Soluciones médicas de calidad | www.implameq.com';
      doc.text(footerText, pageWidth / 2, pageHeight - 13, { align: 'center' });
      
      // Número de página
      doc.setFont('helvetica', 'normal');
      doc.text(`Página ${i} de ${totalPages}`, pageWidth - 15, pageHeight - 13, { align: 'right' });
      
      // Fecha de generación
      const fechaGeneracion = new Date().toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      doc.text(`Generado: ${fechaGeneracion}`, 15, pageHeight - 13);
    }

    // ============================================
    // GUARDAR PDF
    // ============================================
    
    const fileName = `Cotizacion_${cotizacion.numero_cotizacion.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    doc.save(fileName);
  }

  /**
   * Obtiene el color según el estado
   */
  private getEstadoColor(estado: string): { r: number, g: number, b: number } {
    switch (estado) {
      case 'borrador': return { r: 107, g: 114, b: 128 }; // gray
      case 'enviada': return { r: 59, g: 130, b: 246 }; // blue
      case 'aprobada': return { r: 34, g: 197, b: 94 }; // green
      case 'rechazada': return { r: 239, g: 68, b: 68 }; // red
      case 'vencida': return { r: 249, g: 115, b: 22 }; // orange
      default: return { r: 107, g: 114, b: 128 }; // gray
    }
  }

  /**
   * Formatea una fecha al formato local
   */
  private formatDate(date: string | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Formatea un número como moneda
   */
  private formatMoney(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  }

  /**
   * Calcula los días de validez entre dos fechas
   */
  private calcularDiasValidez(fechaEmision: string, fechaVencimiento: string): number {
    const emision = new Date(fechaEmision);
    const vencimiento = new Date(fechaVencimiento);
    const diffTime = Math.abs(vencimiento.getTime() - emision.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }
}
