import{Ta as v,c as t,e as n,g as c,j as s,n as _,q as p,u as g}from"./chunk-IAYZCRTW.js";import{a as d,b as u}from"./chunk-FK42CRUA.js";var b=class l{supabase=g(v);getProductos(){return t(this.supabase.client.from("productos").select(`
          *,
          inventario:inventario(
            id,
            cantidad,
            ubicacion,
            estado,
            fecha_vencimiento
          )
        `).eq("es_activo",!0).order("nombre")).pipe(c(o=>{if(o.error)throw console.error("Error fetching productos:",o.error),new Error(o.error.message||"Error al cargar productos");return(o.data||[]).map(e=>{let i=e.inventario?.reduce((a,m)=>a+(m.cantidad||0),0)||0;return u(d({},e),{stock_total:i,unidad_medida:e.unidad_medida||"unidad",descripcion:e.descripcion||"",proveedor:e.proveedor||"",ubicacion_principal:e.ubicacion_principal||"",notas:e.notas||"",updated_at:e.updated_at||e.created_at})})}),s(o=>(console.error("Service error fetching productos:",o),n(()=>o))))}getProductoById(o){return t(this.supabase.client.from("productos").select(`
          *,
          inventario:inventario(
            id,
            cantidad,
            ubicacion,
            estado,
            fecha_vencimiento
          )
        `).eq("id",o).single()).pipe(c(r=>{if(r.error)throw console.error("Error fetching producto:",r.error),new Error(r.error.message||"Error al cargar producto");let e=r.data,i=e.inventario?.reduce((a,m)=>a+(m.cantidad||0),0)||0;return u(d({},e),{stock_total:i,unidad_medida:e.unidad_medida||"unidad",descripcion:e.descripcion||"",proveedor:e.proveedor||"",ubicacion_principal:e.ubicacion_principal||"",notas:e.notas||"",updated_at:e.updated_at||e.created_at})}),s(r=>(console.error("Service error fetching producto:",r),n(()=>r))))}createProducto(o){return t(this.supabase.client.auth.getUser()).pipe(_(r=>{if(!r.data.user)throw new Error("Usuario no autenticado");let i={codigo:o.codigo||this.generateProductCode(o.categoria),nombre:o.nombre,categoria:o.categoria,precio:o.precio,stock_minimo:o.stock_minimo,es_activo:!0};return t(this.supabase.client.from("productos").insert([i]).select("*").single())}),c(r=>{if(r.error)throw console.error("Error creating producto:",r.error),new Error(r.error.message||"Error al crear producto");return u(d({},r.data),{stock_total:0,unidad_medida:"unidad",inventario:[]})}),s(r=>(console.error("Service error creating producto:",r),n(()=>r))))}updateProducto(o,r){return t(this.supabase.client.from("productos").update(r).eq("id",o).select(`
          *,
          inventario:inventario(
            id,
            cantidad,
            ubicacion,
            estado,
            fecha_vencimiento
          )
        `).single()).pipe(c(e=>{if(e.error)throw console.error("Error updating producto:",e.error),new Error(e.error.message||"Error al actualizar producto");return e.data}),s(e=>(console.error("Service error updating producto:",e),n(()=>e))))}getMovimientos(o){let r=this.supabase.client.from("movimientos_inventario").select(`
        *,
        producto:productos(
          id,
          codigo,
          nombre,
          categoria
        ),
        usuario:profiles(
          id,
          full_name,
          email
        )
      `).order("fecha",{ascending:!1});return o?.fecha_desde&&(r=r.gte("fecha",o.fecha_desde)),o?.fecha_hasta&&(r=r.lte("fecha",o.fecha_hasta)),o?.tipo&&(r=r.eq("tipo",o.tipo)),o?.producto_id&&(r=r.eq("producto_id",o.producto_id)),o?.usuario_id&&(r=r.eq("usuario_id",o.usuario_id)),t(r).pipe(c(e=>{if(e.error)throw console.error("Error fetching movimientos:",e.error),new Error(e.error.message||"Error al cargar movimientos");return(e.data||[]).map(a=>u(d({},a),{created_at:a.fecha,ubicacion_origen:a.ubicacion_origen||"",ubicacion_destino:a.ubicacion_destino||"",observaciones:a.observaciones||"",referencia:a.referencia||"",lote:a.lote||"",fecha_vencimiento:a.fecha_vencimiento||""}))}),s(e=>(console.error("Service error fetching movimientos:",e),n(()=>e))))}registrarMovimiento(o){return t(this.supabase.client.auth.getUser()).pipe(_(r=>{let e=r.data.user;if(!e)throw new Error("Usuario no autenticado");let i={inventario_id:o.inventario_id,producto_id:o.producto_id,tipo:o.tipo,cantidad:o.cantidad,motivo:o.motivo||"",usuario_id:e.id};return t(this.supabase.client.from("movimientos_inventario").insert([i]).select(`
              *,
              producto:productos(
                id,
                codigo,
                nombre,
                categoria
              ),
              usuario:profiles(
                id,
                full_name,
                email
              )
            `).single())}),c(r=>{if(r.error)throw console.error("Error registrando movimiento:",r.error),new Error(r.error.message||"Error al registrar movimiento");return u(d({},r.data),{created_at:r.data.fecha})}),s(r=>(console.error("Service error registrando movimiento:",r),n(()=>r))))}getResumenMovimientos(o,r){return t(this.supabase.client.rpc("get_resumen_movimientos",{fecha_desde:o,fecha_hasta:r})).pipe(c(e=>{if(e.error)throw console.error("Error fetching resumen:",e.error),new Error(e.error.message||"Error al cargar resumen");return e.data||{}}),s(e=>(console.error("Service error fetching resumen:",e),n(()=>e))))}getTiposMovimiento(){return[{value:"entrada",label:"Entrada",icon:"\u2795",color:"text-green-600"},{value:"salida",label:"Salida",icon:"\u2796",color:"text-red-600"},{value:"ajuste",label:"Ajuste",icon:"\u2696\uFE0F",color:"text-blue-600"},{value:"transferencia",label:"Transferencia",icon:"\u{1F504}",color:"text-purple-600"}]}getMotivosComunes(){return{entrada:["Compra","Donaci\xF3n","Devoluci\xF3n","Ajuste de inventario","Transferencia recibida"],salida:["Uso en cirug\xEDa","Venta","Donaci\xF3n","P\xE9rdida","Vencimiento","Transferencia enviada"],ajuste:["Correcci\xF3n de stock","Inventario f\xEDsico","Error de sistema"],transferencia:["Redistribuci\xF3n de stock","Cambio de ubicaci\xF3n","Optimizaci\xF3n de inventario"]}}generateProductCode(o){let e={implantes:"IMP",instrumentos:"INS",consumibles:"CON",equipos:"EQU",medicamentos:"MED"}[o]||"PRD",i=Date.now().toString().slice(-6);return`${e}-${i}`}getCategorias(){return["implantes","instrumentos","consumibles","equipos","medicamentos"]}getUbicaciones(){return["sede_principal_norte","sede_principal_sur","sede_secundaria_este","sede_secundaria_oeste","bodega_central","bodega_norte","bodega_sur","quirofano_sede_norte_1","quirofano_sede_norte_2","quirofano_sede_sur_1","quirofano_sede_sur_2","emergencia_norte","emergencia_sur","esterilizacion_central"]}getUbicacionesOrganizadas(){return{sedes_principales:[{value:"sede_principal_norte",label:"Sede Principal Norte"},{value:"sede_principal_sur",label:"Sede Principal Sur"}],sedes_secundarias:[{value:"sede_secundaria_este",label:"Sede Secundaria Este"},{value:"sede_secundaria_oeste",label:"Sede Secundaria Oeste"}],bodegas:[{value:"bodega_central",label:"Bodega Central"},{value:"bodega_norte",label:"Bodega Norte"},{value:"bodega_sur",label:"Bodega Sur"}],quirofanos:[{value:"quirofano_sede_norte_1",label:"Quir\xF3fano Norte 1"},{value:"quirofano_sede_norte_2",label:"Quir\xF3fano Norte 2"},{value:"quirofano_sede_sur_1",label:"Quir\xF3fano Sur 1"},{value:"quirofano_sede_sur_2",label:"Quir\xF3fano Sur 2"}],emergencias:[{value:"emergencia_norte",label:"Emergencia Norte"},{value:"emergencia_sur",label:"Emergencia Sur"}],especiales:[{value:"esterilizacion_central",label:"Esterilizaci\xF3n Central"}]}}getUnidadesMedida(){return["unidad","caja","paquete","metro","kilogramo","litro","mililitro","gramo"]}static \u0275fac=function(r){return new(r||l)};static \u0275prov=p({token:l,factory:l.\u0275fac,providedIn:"root"})};export{b as a};
