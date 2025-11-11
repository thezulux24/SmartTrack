import{a as v}from"./chunk-YGGYEX66.js";import{v as b}from"./chunk-3OSVPALZ.js";import{M as h,S as g,h as _,n as l}from"./chunk-MBDN4FSM.js";import{a as u,b as p,i as d}from"./chunk-ODN5LVDJ.js";var k=class m{supabase=g(b);notificationService=g(v);getMensajerosDisponibles(){return _(this.supabase.client.from("mensajeros").select("*").eq("estado","disponible").order("nombre")).pipe(l(e=>e.data||[]))}asignarMensajero(e){return d(this,null,function*(){try{let{data:i,error:a}=yield this.supabase.client.from("envios").insert({kit_id:e.kit_id,mensajero_id:e.mensajero_id,direccion_destino:e.direccion_destino,contacto_destino:e.contacto_destino,telefono_destino:e.telefono_destino,fecha_programada:e.fecha_programada,observaciones:e.observaciones,estado:"programado"}).select().single();if(a)return console.error("Error creando env\xEDo:",a),{exito:!1,mensaje:"Error al crear el env\xEDo"};let{error:r}=yield this.supabase.client.from("kits_cirugia").update({estado:"en_transito",fecha_envio:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",e.kit_id);if(r)return console.error("Error actualizando kit:",r),{exito:!1,mensaje:"Error al actualizar el estado del kit"};yield this.supabase.client.from("kit_trazabilidad").insert({kit_id:e.kit_id,accion:"Asignado a mensajero para env\xEDo",estado_anterior:"listo_envio",estado_nuevo:"en_transito",usuario_id:(yield this.supabase.client.auth.getUser()).data.user?.id,timestamp:new Date().toISOString(),observaciones:"Mensajero asignado para env\xEDo.",metadata:{envio_id:i.id,mensajero_id:e.mensajero_id}});let{data:o}=yield this.supabase.client.from("kits_cirugia").select("numero_kit").eq("id",e.kit_id).single(),{data:t}=yield this.supabase.client.from("mensajeros").select("nombre").eq("id",e.mensajero_id).single();return o&&t&&(yield this.notificationService.notifyMensajeroAssigned(i.id,e.kit_id,o.numero_kit,e.mensajero_id,t.nombre,e.direccion_destino,e.fecha_programada).catch(n=>console.error("Error enviando notificaci\xF3n de asignaci\xF3n:",n))),{exito:!0,envio:i,mensaje:"Env\xEDo creado exitosamente"}}catch(i){return console.error("Error en asignaci\xF3n de mensajero:",i),{exito:!1,mensaje:"Error al procesar la asignaci\xF3n"}}})}getKitsListosParaEnvio(){return _(this.supabase.client.from("kits_cirugia").select(`
          *,
          cirugias!inner(
            numero_cirugia,
            fecha_programada,
            medico_cirujano,
            hospitales(
              nombre,
              direccion,
              ciudad,
              contacto_principal,
              telefono
            ),
            clientes(
              nombre,
              apellido,
              telefono
            )
          )
        `).eq("estado","listo_envio").order("created_at",{ascending:!1})).pipe(l(e=>(e.data||[]).map(r=>p(u({},r),{cirugia:r.cirugias})).sort((r,o)=>{let t=r.cirugia?.fecha_programada?new Date(r.cirugia.fecha_programada).getTime():0,n=o.cirugia?.fecha_programada?new Date(o.cirugia.fecha_programada).getTime():0;return t-n})))}getEnviosActivos(){return _(this.supabase.client.from("envios").select(`
          id,
          kit_id,
          mensajero_id,
          direccion_destino,
          contacto_destino,
          telefono_destino,
          fecha_programada,
          hora_salida,
          hora_llegada,
          estado,
          observaciones,
          created_at,
          kits_cirugia (
            id,
            numero_kit,
            qr_code,
            cirugia_id,
            cirugias (
              numero_cirugia,
              hospital_id,
              hospitales (
                nombre
              )
            )
          ),
          mensajeros (
            nombre,
            telefono,
            placa
          )
        `).in("estado",["programado","en_transito"]).order("fecha_programada",{ascending:!0})).pipe(l(e=>e.data?e.data.map(i=>p(u({},i),{kit:{id:i.kits_cirugia?.id,numero_kit:i.kits_cirugia?.numero_kit,codigo_qr:i.kits_cirugia?.qr_code,cirugia:{numero_cirugia:i.kits_cirugia?.cirugias?.numero_cirugia,hospital:{nombre:i.kits_cirugia?.cirugias?.hospitales?.nombre}}},mensajero:{nombre:i.mensajeros?.nombre,telefono:i.mensajeros?.telefono,placa:i.mensajeros?.placa}})):[]))}iniciarEnvio(e){return d(this,null,function*(){try{let{data:i,error:a}=yield this.supabase.client.from("envios").select("kit_id, mensajero_id").eq("id",e).single();if(a)throw a;let{error:r}=yield this.supabase.client.from("envios").update({estado:"en_transito",hora_salida:new Date().toISOString()}).eq("id",e);if(r)throw r;return yield this.supabase.client.from("kit_trazabilidad").insert({kit_id:i.kit_id,accion:"Env\xEDo iniciado - Mensajero en ruta",estado_anterior:"en_transito",estado_nuevo:"en_transito",usuario_id:(yield this.supabase.client.auth.getUser()).data.user?.id,timestamp:new Date().toISOString(),observaciones:"Mensajero ha iniciado el trayecto hacia el destino",metadata:{envio_id:e,mensajero_id:i.mensajero_id}}),{exito:!0,mensaje:"Env\xEDo iniciado exitosamente"}}catch(i){return console.error("Error iniciando env\xEDo:",i),{exito:!1,mensaje:"Error al iniciar el env\xEDo"}}})}confirmarEntrega(e,i){return d(this,null,function*(){try{let{data:a,error:r}=yield this.supabase.client.from("envios").select("kit_id, mensajero_id").eq("id",e).single();if(r)throw r;let o=new Date().toISOString(),{error:t}=yield this.supabase.client.from("envios").update({estado:"entregado",hora_llegada:o}).eq("id",e);if(t)throw t;let{error:n}=yield this.supabase.client.from("kits_cirugia").update({estado:"entregado",fecha_recepcion:o,cliente_receptor_nombre:i.nombre_receptor,cliente_receptor_cedula:i.documento_receptor||null,cliente_validacion_fecha:o,updated_at:o}).eq("id",a.kit_id);if(n)throw n;let{data:j}=yield this.supabase.client.from("kits_cirugia").select("tecnico_id").eq("id",a.kit_id).single(),{error:f}=yield this.supabase.client.from("kit_trazabilidad").insert({kit_id:a.kit_id,accion:"Kit entregado al cliente",estado_anterior:"en_transito",estado_nuevo:"entregado",usuario_id:j?.tecnico_id||a.mensajero_id,timestamp:o,observaciones:`Recibido por: ${i.nombre_receptor}${i.documento_receptor?` - Doc: ${i.documento_receptor}`:""}`,metadata:{envio_id:e,mensajero_id:a.mensajero_id,receptor:i,validado_via:"qr_scan",ubicacion_validacion:"destino_final",validacion_publica:!0}});f&&console.error("\u26A0\uFE0F Error registrando trazabilidad:",f);let{data:s}=yield this.supabase.client.from("kits_cirugia").select(`
          numero_kit,
          cirugia_id,
          cirugia:cirugias!kits_cirugia_cirugia_id_fkey(
            tecnico_asignado_id,
            hospital_id,
            hospital_data:hospitales(direccion)
          )
        `).eq("id",a.kit_id).single();if(s&&s.cirugia){let c=Array.isArray(s.cirugia)?s.cirugia[0]:s.cirugia,w=c?.hospital_data?Array.isArray(c.hospital_data)?c.hospital_data[0]:c.hospital_data:null;yield this.notificationService.notifyDeliveryStatusChange(e,a.kit_id,s.numero_kit,"en_transito","entregado",c?.tecnico_asignado_id||null,w?.direccion||"Destino").catch(E=>console.error("Error enviando notificaci\xF3n de entrega:",E))}return{exito:!0,mensaje:"Entrega confirmada exitosamente"}}catch(a){return console.error("Error confirmando entrega:",a),{exito:!1,mensaje:"Error al confirmar la entrega"}}})}static \u0275fac=function(i){return new(i||m)};static \u0275prov=h({token:m,factory:m.\u0275fac,providedIn:"root"})};export{k as a};
