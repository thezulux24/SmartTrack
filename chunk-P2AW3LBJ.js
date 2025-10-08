import{Ta as p,c as s,g as c,q as _,u as l}from"./chunk-IAYZCRTW.js";import{a as m,b as u,h as n}from"./chunk-FK42CRUA.js";var g=class d{supabase=l(p);getMensajerosDisponibles(){return s(this.supabase.client.from("mensajeros").select("*").eq("estado","disponible").order("nombre")).pipe(c(a=>a.data||[]))}asignarMensajero(a){return n(this,null,function*(){try{let{data:e,error:i}=yield this.supabase.client.from("envios").insert({kit_id:a.kit_id,mensajero_id:a.mensajero_id,direccion_destino:a.direccion_destino,contacto_destino:a.contacto_destino,telefono_destino:a.telefono_destino,fecha_programada:a.fecha_programada,observaciones:a.observaciones,estado:"programado"}).select().single();if(i)return console.error("Error creando env\xEDo:",i),{exito:!1,mensaje:"Error al crear el env\xEDo"};let{error:r}=yield this.supabase.client.from("kits_cirugia").update({estado:"en_transito",fecha_envio:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",a.kit_id);return r?(console.error("Error actualizando kit:",r),{exito:!1,mensaje:"Error al actualizar el estado del kit"}):(yield this.supabase.client.from("kit_trazabilidad").insert({kit_id:a.kit_id,accion:"Asignado a mensajero para env\xEDo",estado_anterior:"listo_envio",estado_nuevo:"en_transito",usuario_id:(yield this.supabase.client.auth.getUser()).data.user?.id,timestamp:new Date().toISOString(),observaciones:"Mensajero asignado para env\xEDo.",metadata:{envio_id:e.id,mensajero_id:a.mensajero_id}}),{exito:!0,envio:e,mensaje:"Env\xEDo creado exitosamente"})}catch(e){return console.error("Error en asignaci\xF3n de mensajero:",e),{exito:!1,mensaje:"Error al procesar la asignaci\xF3n"}}})}getKitsListosParaEnvio(){return s(this.supabase.client.from("kits_cirugia").select(`
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
        `).eq("estado","listo_envio").order("created_at",{ascending:!1})).pipe(c(a=>(a.data||[]).map(r=>u(m({},r),{cirugia:r.cirugias})).sort((r,o)=>{let t=r.cirugia?.fecha_programada?new Date(r.cirugia.fecha_programada).getTime():0,f=o.cirugia?.fecha_programada?new Date(o.cirugia.fecha_programada).getTime():0;return t-f})))}getEnviosActivos(){return s(this.supabase.client.from("envios").select(`
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
        `).in("estado",["programado","en_transito"]).order("fecha_programada",{ascending:!0})).pipe(c(a=>a.data?a.data.map(e=>u(m({},e),{kit:{id:e.kits_cirugia?.id,numero_kit:e.kits_cirugia?.numero_kit,codigo_qr:e.kits_cirugia?.qr_code,cirugia:{numero_cirugia:e.kits_cirugia?.cirugias?.numero_cirugia,hospital:{nombre:e.kits_cirugia?.cirugias?.hospitales?.nombre}}},mensajero:{nombre:e.mensajeros?.nombre,telefono:e.mensajeros?.telefono,placa:e.mensajeros?.placa}})):[]))}iniciarEnvio(a){return n(this,null,function*(){try{let{data:e,error:i}=yield this.supabase.client.from("envios").select("kit_id, mensajero_id").eq("id",a).single();if(i)throw i;let{error:r}=yield this.supabase.client.from("envios").update({estado:"en_transito",hora_salida:new Date().toISOString()}).eq("id",a);if(r)throw r;return yield this.supabase.client.from("kit_trazabilidad").insert({kit_id:e.kit_id,accion:"Env\xEDo iniciado - Mensajero en ruta",estado_anterior:"en_transito",estado_nuevo:"en_transito",usuario_id:(yield this.supabase.client.auth.getUser()).data.user?.id,timestamp:new Date().toISOString(),observaciones:"Mensajero ha iniciado el trayecto hacia el destino",metadata:{envio_id:a,mensajero_id:e.mensajero_id}}),{exito:!0,mensaje:"Env\xEDo iniciado exitosamente"}}catch(e){return console.error("Error iniciando env\xEDo:",e),{exito:!1,mensaje:"Error al iniciar el env\xEDo"}}})}confirmarEntrega(a,e){return n(this,null,function*(){try{let{data:i,error:r}=yield this.supabase.client.from("envios").select("kit_id, mensajero_id").eq("id",a).single();if(r)throw r;let{error:o}=yield this.supabase.client.from("envios").update({estado:"entregado",hora_llegada:new Date().toISOString()}).eq("id",a);if(o)throw o;let{error:t}=yield this.supabase.client.from("kits_cirugia").update({estado:"entregado",updated_at:new Date().toISOString()}).eq("id",i.kit_id);if(t)throw t;return yield this.supabase.client.from("kit_trazabilidad").insert({kit_id:i.kit_id,accion:"Kit entregado al cliente",estado_anterior:"en_transito",estado_nuevo:"entregado",usuario_id:(yield this.supabase.client.auth.getUser()).data.user?.id,timestamp:new Date().toISOString(),observaciones:`Recibido por: ${e.nombre_receptor}${e.documento_receptor?` - Doc: ${e.documento_receptor}`:""}`,metadata:{envio_id:a,mensajero_id:i.mensajero_id,receptor:e}}),{exito:!0,mensaje:"Entrega confirmada exitosamente"}}catch(i){return console.error("Error confirmando entrega:",i),{exito:!1,mensaje:"Error al confirmar la entrega"}}})}static \u0275fac=function(e){return new(e||d)};static \u0275prov=_({token:d,factory:d.\u0275fac,providedIn:"root"})};export{g as a};
