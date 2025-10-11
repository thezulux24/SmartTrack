import{v as g}from"./chunk-SVQ7HZAZ.js";import{M as u,S as p,h as c,n as d}from"./chunk-YIZ2QXS6.js";import{a as _,b as l,i as s}from"./chunk-ODN5LVDJ.js";var f=class m{supabase=p(g);getMensajerosDisponibles(){return c(this.supabase.client.from("mensajeros").select("*").eq("estado","disponible").order("nombre")).pipe(d(a=>a.data||[]))}asignarMensajero(a){return s(this,null,function*(){try{let{data:e,error:i}=yield this.supabase.client.from("envios").insert({kit_id:a.kit_id,mensajero_id:a.mensajero_id,direccion_destino:a.direccion_destino,contacto_destino:a.contacto_destino,telefono_destino:a.telefono_destino,fecha_programada:a.fecha_programada,observaciones:a.observaciones,estado:"programado"}).select().single();if(i)return console.error("Error creando env\xEDo:",i),{exito:!1,mensaje:"Error al crear el env\xEDo"};let{error:r}=yield this.supabase.client.from("kits_cirugia").update({estado:"en_transito",fecha_envio:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",a.kit_id);return r?(console.error("Error actualizando kit:",r),{exito:!1,mensaje:"Error al actualizar el estado del kit"}):(yield this.supabase.client.from("kit_trazabilidad").insert({kit_id:a.kit_id,accion:"Asignado a mensajero para env\xEDo",estado_anterior:"listo_envio",estado_nuevo:"en_transito",usuario_id:(yield this.supabase.client.auth.getUser()).data.user?.id,timestamp:new Date().toISOString(),observaciones:"Mensajero asignado para env\xEDo.",metadata:{envio_id:e.id,mensajero_id:a.mensajero_id}}),{exito:!0,envio:e,mensaje:"Env\xEDo creado exitosamente"})}catch(e){return console.error("Error en asignaci\xF3n de mensajero:",e),{exito:!1,mensaje:"Error al procesar la asignaci\xF3n"}}})}getKitsListosParaEnvio(){return c(this.supabase.client.from("kits_cirugia").select(`
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
        `).eq("estado","listo_envio").order("created_at",{ascending:!1})).pipe(d(a=>(a.data||[]).map(r=>l(_({},r),{cirugia:r.cirugias})).sort((r,o)=>{let t=r.cirugia?.fecha_programada?new Date(r.cirugia.fecha_programada).getTime():0,n=o.cirugia?.fecha_programada?new Date(o.cirugia.fecha_programada).getTime():0;return t-n})))}getEnviosActivos(){return c(this.supabase.client.from("envios").select(`
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
        `).in("estado",["programado","en_transito"]).order("fecha_programada",{ascending:!0})).pipe(d(a=>a.data?a.data.map(e=>l(_({},e),{kit:{id:e.kits_cirugia?.id,numero_kit:e.kits_cirugia?.numero_kit,codigo_qr:e.kits_cirugia?.qr_code,cirugia:{numero_cirugia:e.kits_cirugia?.cirugias?.numero_cirugia,hospital:{nombre:e.kits_cirugia?.cirugias?.hospitales?.nombre}}},mensajero:{nombre:e.mensajeros?.nombre,telefono:e.mensajeros?.telefono,placa:e.mensajeros?.placa}})):[]))}iniciarEnvio(a){return s(this,null,function*(){try{let{data:e,error:i}=yield this.supabase.client.from("envios").select("kit_id, mensajero_id").eq("id",a).single();if(i)throw i;let{error:r}=yield this.supabase.client.from("envios").update({estado:"en_transito",hora_salida:new Date().toISOString()}).eq("id",a);if(r)throw r;return yield this.supabase.client.from("kit_trazabilidad").insert({kit_id:e.kit_id,accion:"Env\xEDo iniciado - Mensajero en ruta",estado_anterior:"en_transito",estado_nuevo:"en_transito",usuario_id:(yield this.supabase.client.auth.getUser()).data.user?.id,timestamp:new Date().toISOString(),observaciones:"Mensajero ha iniciado el trayecto hacia el destino",metadata:{envio_id:a,mensajero_id:e.mensajero_id}}),{exito:!0,mensaje:"Env\xEDo iniciado exitosamente"}}catch(e){return console.error("Error iniciando env\xEDo:",e),{exito:!1,mensaje:"Error al iniciar el env\xEDo"}}})}confirmarEntrega(a,e){return s(this,null,function*(){try{let{data:i,error:r}=yield this.supabase.client.from("envios").select("kit_id, mensajero_id").eq("id",a).single();if(r)throw r;let o=new Date().toISOString(),{error:t}=yield this.supabase.client.from("envios").update({estado:"entregado",hora_llegada:o}).eq("id",a);if(t)throw t;let{error:n}=yield this.supabase.client.from("kits_cirugia").update({estado:"entregado",fecha_recepcion:o,cliente_receptor_nombre:e.nombre_receptor,cliente_receptor_cedula:e.documento_receptor||null,cliente_validacion_fecha:o,updated_at:o}).eq("id",i.kit_id);if(n)throw n;return yield this.supabase.client.from("kit_trazabilidad").insert({kit_id:i.kit_id,accion:"Kit entregado al cliente",estado_anterior:"en_transito",estado_nuevo:"entregado",usuario_id:null,timestamp:o,observaciones:`Recibido por: ${e.nombre_receptor}${e.documento_receptor?` - Doc: ${e.documento_receptor}`:""}`,metadata:{envio_id:a,mensajero_id:i.mensajero_id,receptor:e,validado_via:"qr_scan",ubicacion_validacion:"destino_final"}}),{exito:!0,mensaje:"Entrega confirmada exitosamente"}}catch(i){return console.error("Error confirmando entrega:",i),{exito:!1,mensaje:"Error al confirmar la entrega"}}})}static \u0275fac=function(e){return new(e||m)};static \u0275prov=u({token:m,factory:m.\u0275fac,providedIn:"root"})};export{f as a};
