import{v as g}from"./chunk-SVQ7HZAZ.js";import{M as p,R as _,h as r,n as o}from"./chunk-YIZ2QXS6.js";import{i as n}from"./chunk-ODN5LVDJ.js";var b=class d{constructor(e){this.supabase=e}crearKit(e){return r(this.crearKitCompleto(e))}crearKitCompleto(e){return n(this,null,function*(){let a=`KIT-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`,{data:i,error:t}=yield this.supabase.client.from("kits_cirugia").insert({cirugia_id:e.cirugia_id,numero_kit:a,qr_code:`QR-${a}`,estado:"solicitado",comercial_id:(yield this.supabase.client.auth.getUser()).data.user?.id,observaciones:e.observaciones}).select().single();if(t)throw t;if(e.productos&&e.productos.length>0){let f=e.productos.map(u=>({kit_id:i.id,producto_id:u.producto_id,cantidad_solicitada:u.cantidad_solicitada,cantidad_preparada:0,cantidad_enviada:0,cantidad_utilizada:0,cantidad_devuelta:0,observaciones:u.observaciones,created_at:new Date().toISOString()})),{error:l}=yield this.supabase.client.from("kit_productos").insert(f);if(l)throw l}yield this.supabase.client.from("kit_trazabilidad").insert({kit_id:i.id,usuario_id:(yield this.supabase.client.auth.getUser()).data.user?.id,accion:"kit_creado",estado_nuevo:"solicitado",observaciones:"Kit solicitado por comercial - Pendiente de aprobaci\xF3n log\xEDstica"});let{data:c,error:s}=yield this.supabase.client.from("kits_cirugia").select(`
        *,
        cirugia:cirugias(*),
        comercial:profiles!comercial_id(*),
        productos:kit_productos(
          *,
          producto:productos(*)
        )
      `).eq("id",i.id).single();if(s)throw s;return c})}tieneKit(e){return r(this.supabase.client.from("kits_cirugia").select("id").eq("cirugia_id",e).limit(1)).pipe(o(({data:a,error:i})=>{if(i)throw i;return a&&a.length>0}))}getKitPorCirugia(e){return r(this.supabase.client.from("kits_cirugia").select(`
          *,
          cirugia:cirugias(*),
          comercial:profiles!comercial_id(*),
          tecnico:profiles!tecnico_id(*),
          logistica:profiles!logistica_id(*),
          productos:kit_productos(
            *,
            producto:productos(*)
          )
        `).eq("cirugia_id",e).single()).pipe(o(({data:a,error:i})=>{if(i&&i.code!=="PGRST116")throw i;return a||null}))}getKitsPorEstado(e){return r(this.supabase.client.from("kits_cirugia").select(`
          *,
          cirugia:cirugias(
            *,
            cliente:clientes(*),
            hospital:hospitales(*)
          ),
          comercial:profiles!comercial_id(*),
          tecnico:profiles!tecnico_id(*),
          logistica:profiles!logistica_id(*),
          productos:kit_productos(
            *,
            producto:productos(
              *,
              inventario:inventario(cantidad, ubicacion, estado)
            )
          )
        `).eq("estado",e).order("created_at",{ascending:!1})).pipe(o(({data:a,error:i})=>{if(i)throw i;return a||[]}))}getKitById(e){return r(this.supabase.client.from("kits_cirugia").select(`
          *,
          cirugia:cirugias(*),
          comercial:profiles!comercial_id(*),
          tecnico:profiles!tecnico_id(*),
          logistica:profiles!logistica_id(*),
          productos:kit_productos(
            *,
            producto:productos(*)
          ),
          trazabilidad:kit_trazabilidad(
            *,
            usuario:profiles(*)
          )
        `).eq("id",e).single()).pipe(o(({data:a,error:i})=>{if(i)throw i;return a}))}actualizarEstadoKit(e,a,i){let t={estado:a,updated_at:new Date().toISOString()};switch(i?.observaciones&&(t.observaciones=i.observaciones),i?.ubicacion_actual&&(t.ubicacion_actual=i.ubicacion_actual),a){case"preparando":t.fecha_preparacion=new Date().toISOString();break;case"listo_envio":t.fecha_preparacion=new Date().toISOString();break;case"en_transito":t.fecha_envio=new Date().toISOString();break;case"entregado":case"en_uso":t.fecha_recepcion=new Date().toISOString();break;case"devuelto":t.fecha_devolucion=new Date().toISOString();break}if(i?.usuario_id)switch(a){case"preparando":case"listo_envio":t.logistica_id=i.usuario_id;break;case"en_uso":case"entregado":t.tecnico_id=i.usuario_id;break}return r(this.supabase.client.from("kits_cirugia").update(t).eq("id",e).select().single()).pipe(o(({data:c,error:s})=>{if(s)throw s;return this.supabase.client.from("kit_trazabilidad").insert({kit_id:e,usuario_id:i?.usuario_id,accion:`cambio_estado_${a}`,estado_nuevo:a,observaciones:i?.observaciones||`Estado cambiado a ${a}`}),c}))}getProductosKit(e){return r(this.supabase.client.from("kit_productos").select(`
          *,
          producto:productos(*)
        `).eq("kit_id",e).order("created_at",{ascending:!0})).pipe(o(({data:a,error:i})=>{if(i)throw i;return a||[]}))}generarQrKit(e){return r(this.generarQrKitDirecto(e))}generarQrKitDirecto(e){return n(this,null,function*(){let a=`QR-${e}-${Date.now()}`,{data:i,error:t}=yield this.supabase.client.from("qr_codes").insert({codigo:a,tipo:"kit",referencia_id:e,es_activo:!0,fecha_generacion:new Date().toISOString()}).select().single();if(t)throw t;return i})}escanearQr(e,a){return r(this.escanearQrDirecto(e,a))}escanearQrDirecto(e,a){return n(this,null,function*(){let{data:i,error:t}=yield this.supabase.client.from("qr_codes").select("*").eq("codigo",e).eq("es_activo",!0).single();if(t)throw new Error("C\xF3digo QR no v\xE1lido o expirado");let{data:c,error:s}=yield this.supabase.client.from("qr_escaneos").insert({qr_code_id:i.id,usuario_id:a,fecha_escaneo:new Date().toISOString(),ubicacion:"Ubicaci\xF3n actual",accion_realizada:"kit_escaneado"}).select(`
        *,
        qr_code:qr_codes(*),
        usuario:profiles(*)
      `).single();if(s)throw s;return yield this.supabase.client.from("qr_codes").update({veces_escaneado:i.veces_escaneado+1,ultimo_escaneo:new Date().toISOString()}).eq("id",i.id),i.tipo==="kit"&&i.referencia_id&&(yield this.supabase.client.from("kit_trazabilidad").insert({kit_id:i.referencia_id,usuario_id:a,accion:"qr_escaneado",estado_nuevo:"escaneado",observaciones:`C\xF3digo QR escaneado: ${e}`})),c})}registrarTrazabilidad(e){return r(this.supabase.client.from("kit_trazabilidad").insert({kit_id:e.kit_id,usuario_id:e.usuario_id,accion:e.accion,estado_anterior:e.estado_anterior,estado_nuevo:e.estado_nuevo,ubicacion:e.ubicacion,coordenadas_lat:e.coordenadas_lat,coordenadas_lng:e.coordenadas_lng,observaciones:e.observaciones,metadata:e.metadata}).select(`
          *,
          usuario:profiles(*)
        `).single()).pipe(o(({data:a,error:i})=>{if(i)throw i;return a}))}getTrazabilidadKit(e){return r(this.supabase.client.from("kit_trazabilidad").select(`
          *,
          usuario:profiles(*)
        `).eq("kit_id",e).order("timestamp",{ascending:!0})).pipe(o(({data:a,error:i})=>{if(i)throw i;return a||[]}))}getKit(e){return r(this.supabase.client.from("kits_cirugia").select(`
          *,
          cirugia:cirugias(
            *,
            hospital:hospitales(*),
            tipo_cirugia:tipos_cirugia(*)
          ),
          comercial:profiles!comercial_id(*),
          tecnico:profiles!tecnico_id(*),
          logistica:profiles!logistica_id(*)
        `).eq("id",e).single()).pipe(o(({data:a,error:i})=>{if(i)throw i;return a}))}getKitProductos(e){return r(this.supabase.client.from("kit_productos").select(`
          *,
          producto:productos(*)
        `).eq("kit_id",e).order("created_at",{ascending:!0})).pipe(o(({data:a,error:i})=>{if(i)throw i;return a||[]}))}getKits(e=0,a=20){let i=e*a,t=i+a-1;return r(this.supabase.client.from("kits_cirugia").select(`
          *,
          cirugia:cirugias(*),
          comercial:profiles!comercial_id(*),
          tecnico:profiles!tecnico_id(*),
          logistica:profiles!logistica_id(*)
        `).range(i,t).order("created_at",{ascending:!1})).pipe(o(({data:c,error:s})=>{if(s)throw s;return c||[]}))}buscarKits(e){return r(this.supabase.client.from("kits_cirugia").select(`
          *,
          cirugia:cirugias(*),
          comercial:profiles!comercial_id(*),
          tecnico:profiles!tecnico_id(*),
          logistica:profiles!logistica_id(*)
        `).or(`numero_kit.ilike.%${e}%,observaciones.ilike.%${e}%`).order("created_at",{ascending:!1}).limit(20)).pipe(o(({data:a,error:i})=>{if(i)throw i;return a||[]}))}static \u0275fac=function(a){return new(a||d)(_(g))};static \u0275prov=p({token:d,factory:d.\u0275fac,providedIn:"root"})};export{b as a};
