Mapa de flujo ↔ datos (por fase y rol)

FASE 1 – Comercial (Creación y validación de solicitud)

Entidad principal: cirugias

estado: usar máquina de estados controlada (ver más abajo).

tipo_cirugia_id, hospital_id, cliente_id, usuario_creador_id.

Reserva preliminar de inventario (“kit intendido”):

Crear kits_cirugia en estado solicitado y sus renglones kit_productos.cantidad_solicitada.

Job/trigger de validación de stock que calcule “disponible comprometible” (inventario físico – comprometido) y anote faltantes en kit_productos (campo nuevo sugerido faltante INTEGER).

Si hay faltantes → disparar alerta y dejar kits_cirugia.estado='preparando' con observaciones.

Alertas tempranas:

“Stock insuficiente”, “material próximo a vencerse” (usar inventario.fecha_vencimiento).

FASE 2 – Logística (alistamiento y despacho)

Alistamiento: completar kit_productos.cantidad_preparada, validar vencimientos, asignar lote/fecha_vencimiento.

Trazabilidad: registrar en kit_trazabilidad acciones: “Alistamiento iniciado”, “QR/RFID impreso”, “Listo para despacho”, “Despachado”.

Documentos/logística:

Generar remisión (tabla nueva sugerida remisiones + remision_items).

Asignar mensajero/ruta (tablas nuevas sugeridas mensajeros, rutas, rutas_paradas).

Cambio de estados:

kits_cirugia: preparando → listo_envio → en_transito.

FASE 3 – Técnico (entrega y aceptación)

Recepción por app: escaneo qr_codes → inserta en qr_escaneos con tipo_accion='recepcion_kit' y pasa kits_cirugia.estado='entregado'.

Verificación de contenido: actualizar kit_productos.cantidad_enviada y confirmar contra lista.

FASE 4 – Técnico (ejecución quirúrgica)

Hitos de tiempo: marcar cirugias.hora_inicio (o en una tabla de eventos) y “en proceso”; al finalizar, “finalizada”.

Consumos en tiempo real: kit_productos.cantidad_utilizada y Hoja de gastos digital en hojas_gasto + hoja_gasto_items (ya la tienes).

Comms asincrónicas y KPIs: quedan habilitadas por trazas en cirugia_seguimiento y kit_trazabilidad.

FASE 5 – Cierre técnico + logística

FIN cirugía: cirugias.estado='finalizada', hoja de gasto a revision.

Preparación para recogida: kits_cirugia.estado='devuelto' (cuando llegue a bodega) y marcar kit_productos.cantidad_devuelta.

Validación hoja de gasto: mover a aprobada/rechazada.

FASE 6 – Recogida y procesamiento (Logística)

Recogida: QR de devolución → qr_escaneos.tipo_accion='devolucion_kit', kits_cirugia.estado='devuelto'.

Lavado/Esterilización: eventos en kit_trazabilidad (“en_lavado”, “esterilizado”), conciliación piezas, reposición a inventario y movimientos en movimientos_inventario (entrada por devolución, ajuste por merma si aplica).

FASE 7 – Facturación

Con hoja de gasto aprobada, transferir a ERP/TRP y marcar cirugias → estado='facturada' (o FACTURADO según tu diccionario).

Este encadenado está alineado con los jobs por área y los requerimientos funcionales levantados en tus documentos (centralización de info, panel “aeropuerto”, programación dinámica, etc.).