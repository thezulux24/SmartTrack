import{a as C}from"./chunk-YGGYEX66.js";import{v as b}from"./chunk-3OSVPALZ.js";import{H as l,J as f,M as h,S as p,f as g,h as c,n as _}from"./chunk-MBDN4FSM.js";import{i as d}from"./chunk-ODN5LVDJ.js";var w=class m{supabase=p(b);notificationService=p(C);activeChannels=new Map;unreadCountsSubject=new g(new Map);unreadCounts$=this.unreadCountsSubject.asObservable();getMensajesCirugia(i){return c(this.supabase.client.from("mensajes_cirugia").select(`
          *,
          usuario:profiles(id, full_name, role, email)
        `).eq("cirugia_id",i).order("created_at",{ascending:!0})).pipe(_(({data:e,error:a})=>{if(a)throw a;return e||[]}))}enviarMensaje(i){return c(this.supabase.getSession()).pipe(l(e=>{if(!e?.user?.id)throw new Error("Usuario no autenticado");return c(this.supabase.client.from("mensajes_cirugia").insert({cirugia_id:i.cirugia_id,usuario_id:e.user.id,mensaje:i.mensaje,tipo:i.tipo||"texto",metadata:i.metadata||{}}).select(`
              *,
              usuario:profiles(id, full_name, role, email)
            `).single())}),_(({data:e,error:a})=>{if(a)throw a;return e}),f(e=>d(this,null,function*(){yield this.notifyParticipants(e)})))}notifyParticipants(i){return d(this,null,function*(){try{let e=yield this.supabase.getSession();if(!e?.user?.id){console.warn("\u26A0\uFE0F ChatService: No session, skipping notifications");return}let{data:a}=yield this.supabase.client.from("cirugias").select(`
          id,
          numero_cirugia,
          usuario_creador_id,
          tecnico_asignado_id
        `).eq("id",i.cirugia_id).single();if(!a){console.warn("\u26A0\uFE0F ChatService: Cirugia not found");return}let{data:n}=yield this.supabase.client.from("kits_cirugia").select("logistica_id").eq("cirugia_id",i.cirugia_id).limit(1),s=new Set;if(a.usuario_creador_id&&a.usuario_creador_id!==e.user.id&&s.add(a.usuario_creador_id),a.tecnico_asignado_id&&a.tecnico_asignado_id!==e.user.id&&s.add(a.tecnico_asignado_id),n&&n.length>0&&n[0].logistica_id&&n[0].logistica_id!==e.user.id&&s.add(n[0].logistica_id),s.size>0){let r=i.usuario?.full_name||"Usuario",t=i.tipo==="texto"?i.mensaje:i.tipo==="ubicacion"?"\u{1F4CD} Comparti\xF3 ubicaci\xF3n":"\u{1F4CE} Envi\xF3 un archivo";yield this.notificationService.notifyNewMessage(Array.from(s),i.cirugia_id,a.numero_cirugia,r,t)}}catch(e){console.error("\u274C ChatService: Error notifying participants:",e)}})}marcarComoLeido(i){return c(this.supabase.getSession()).pipe(l(e=>{if(!e?.user?.id)throw new Error("Usuario no autenticado");return c(this.supabase.client.rpc("mark_messages_as_read",{p_cirugia_id:i,p_user_id:e.user.id}))}),_(({error:e})=>{if(e)throw e}))}getUnreadCount(i){return c(this.supabase.getSession()).pipe(l(e=>e?.user?.id?c(this.supabase.client.rpc("get_unread_messages_count",{p_user_id:e.user.id,p_cirugia_id:i})):c(Promise.resolve(0))),_(e=>e.error?(console.error("Error getting unread count:",e.error),0):e.data||0))}getChatList(){return c(this.supabase.getSession()).pipe(l(i=>d(this,null,function*(){if(!i?.user?.id)throw new Error("Usuario no autenticado");let{data:e}=yield this.supabase.client.from("profiles").select("role").eq("id",i.user.id).single(),a=[];if(e?.role==="logistica"||e?.role==="admin"){let{data:r,error:t}=yield this.supabase.client.from("cirugias").select(`
              id,
              numero_cirugia,
              estado,
              usuario_creador_id,
              tecnico_asignado_id
            `).order("fecha_programada",{ascending:!1});if(t)throw t;a=r||[]}else{let{data:r,error:t}=yield this.supabase.client.from("cirugias").select(`
              id,
              numero_cirugia,
              estado,
              usuario_creador_id,
              tecnico_asignado_id
            `).or(`usuario_creador_id.eq.${i.user.id},tecnico_asignado_id.eq.${i.user.id}`);if(t)throw t;a=r||[]}if((a?.map(r=>r.id)||[]).length===0)return[];let s=[];for(let r of a||[]){let{data:t}=yield this.supabase.client.from("mensajes_cirugia").select(`
              mensaje,
              created_at,
              usuario:profiles(full_name)
            `).eq("cirugia_id",r.id).order("created_at",{ascending:!1}).limit(1),u=t&&t.length>0?t[0]:null;if(!u)continue;let{data:o}=yield this.supabase.client.rpc("get_unread_messages_count",{p_user_id:i.user.id,p_cirugia_id:r.id});s.push({cirugia_id:r.id,numero_cirugia:r.numero_cirugia,ultimo_mensaje:u.mensaje,ultimo_mensaje_fecha:u.created_at,ultimo_mensaje_usuario:u.usuario?.full_name||"Desconocido",mensajes_no_leidos:o||0,participantes_count:2,estado_cirugia:r.estado})}return s.sort((r,t)=>new Date(t.ultimo_mensaje_fecha).getTime()-new Date(r.ultimo_mensaje_fecha).getTime())})))}getChatCompleto(i){return c(this.supabase.getSession()).pipe(l(e=>d(this,null,function*(){if(!e?.user?.id)throw new Error("Usuario no autenticado");let{data:a,error:n}=yield this.supabase.client.from("cirugias").select(`
            id,
            numero_cirugia,
            estado,
            fecha_programada,
            medico_cirujano,
            usuario_creador_id,
            tecnico_asignado_id,
            cliente:clientes(nombre, apellido),
            hospital:hospitales(nombre)
          `).eq("id",i).single();if(n)throw n;let s=[];if(a.usuario_creador_id){let{data:o}=yield this.supabase.client.from("profiles").select("id, full_name, role, email").eq("id",a.usuario_creador_id).single();o&&s.push({id:o.id,nombre:o.full_name,rol:o.role,email:o.email})}if(a.tecnico_asignado_id){let{data:o}=yield this.supabase.client.from("profiles").select("id, full_name, role, email").eq("id",a.tecnico_asignado_id).single();o&&s.push({id:o.id,nombre:o.full_name,rol:o.role,email:o.email})}let{data:r,error:t}=yield this.supabase.client.from("mensajes_cirugia").select(`
            *,
            usuario:profiles(id, full_name, role, email)
          `).eq("cirugia_id",i).order("created_at",{ascending:!0});if(t)throw t;let{data:u}=yield this.supabase.client.rpc("get_unread_messages_count",{p_user_id:e.user.id,p_cirugia_id:i});return{cirugia:{id:a.id,numero_cirugia:a.numero_cirugia,estado:a.estado,fecha_programada:a.fecha_programada,medico_cirujano:a.medico_cirujano,cliente:Array.isArray(a.cliente)?a.cliente[0]:a.cliente,hospital:Array.isArray(a.hospital)?a.hospital[0]:a.hospital},participantes:s,mensajes:r||[],mensajes_no_leidos:u||0}})))}suscribirMensajes(i,e){this.desuscribirMensajes(i);let a=`chat_${i}`,n=this.supabase.client.channel(a).on("postgres_changes",{event:"INSERT",schema:"public",table:"mensajes_cirugia",filter:`cirugia_id=eq.${i}`},s=>d(this,null,function*(){let r=s.new.id,{data:t,error:u}=yield this.supabase.client.from("mensajes_cirugia").select(`
              *,
              usuario:profiles(id, full_name, role, email)
            `).eq("id",r).single();if(u){console.error("\u274C ChatService: Error fetching message:",u);return}t&&e(t)})).subscribe((s,r)=>{r&&console.error("\u274C ChatService: Subscription error:",r),s==="CHANNEL_ERROR"&&console.error("\u274C ChatService: Channel error - Check if Realtime is enabled for mensajes_cirugia"),s==="TIMED_OUT"&&console.error("\u274C ChatService: Subscription timed out")});this.activeChannels.set(i,n)}desuscribirMensajes(i){let e=this.activeChannels.get(i);e&&(this.supabase.client.removeChannel(e),this.activeChannels.delete(i))}limpiarSuscripciones(){this.activeChannels.forEach(i=>{this.supabase.client.removeChannel(i)}),this.activeChannels.clear()}actualizarUnreadCounts(){return d(this,null,function*(){let i=yield this.supabase.getSession();if(!i?.user?.id)return;let{data:e}=yield this.supabase.client.from("cirugias").select("id").or(`usuario_creador_id.eq.${i.user.id},tecnico_asignado_id.eq.${i.user.id}`);if(!e)return;let a=new Map;for(let n of e){let{data:s}=yield this.supabase.client.rpc("get_unread_messages_count",{p_user_id:i.user.id,p_cirugia_id:n.id});s&&s>0&&a.set(n.id,s)}this.unreadCountsSubject.next(a)})}static \u0275fac=function(e){return new(e||m)};static \u0275prov=h({token:m,factory:m.\u0275fac,providedIn:"root"})};export{w as a};
