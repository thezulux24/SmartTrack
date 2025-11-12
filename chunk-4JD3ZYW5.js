import{v as b}from"./chunk-3OSVPALZ.js";import{H as p,M as g,S as v,h as t,j as n,n as c,v as d}from"./chunk-MBDN4FSM.js";import{a as s,b as u}from"./chunk-ODN5LVDJ.js";var f=class l{supabase=v(b);getProductos(){return t(this.supabase.client.from("productos").select(`
          *,
          inventario:inventario(
            id,
            cantidad,
            ubicacion,
            estado,
            fecha_vencimiento
          )
        `).eq("es_activo",!0).order("nombre")).pipe(c(o=>{if(o.error)throw console.error("Error fetching productos:",o.error),new Error(o.error.message||"Error al cargar productos");return(o.data||[]).map(r=>{let a=r.inventario?.reduce((i,m)=>i+(m.cantidad||0),0)||0;return u(s({},r),{stock_total:a,unidad_medida:r.unidad_medida||"unidad",descripcion:r.descripcion||"",proveedor:r.proveedor||"",ubicacion_principal:r.ubicacion_principal||"",notas:r.notas||"",updated_at:r.updated_at||r.created_at})})}),d(o=>(console.error("Service error fetching productos:",o),n(()=>o))))}getProductoById(o){return t(this.supabase.client.from("productos").select(`
          *,
          inventario:inventario(
            id,
            cantidad,
            ubicacion,
            estado,
            fecha_vencimiento
          )
        `).eq("id",o).single()).pipe(c(e=>{if(e.error)throw console.error("Error fetching producto:",e.error),new Error(e.error.message||"Error al cargar producto");let r=e.data,a=r.inventario?.reduce((i,m)=>i+(m.cantidad||0),0)||0;return u(s({},r),{stock_total:a,unidad_medida:r.unidad_medida||"unidad",descripcion:r.descripcion||"",proveedor:r.proveedor||"",ubicacion_principal:r.ubicacion_principal||"",notas:r.notas||"",updated_at:r.updated_at||r.created_at})}),d(e=>(console.error("Service error fetching producto:",e),n(()=>e))))}createProducto(o){return t(this.supabase.client.auth.getUser()).pipe(p(e=>{if(!e.data.user)throw new Error("Usuario no autenticado");let a={codigo:o.codigo||this.generateProductCode(o.categoria),nombre:o.nombre,categoria:o.categoria,precio:o.precio,stock_minimo:o.stock_minimo,es_activo:!0};return t(this.supabase.client.from("productos").insert([a]).select("*").single())}),c(e=>{if(e.error)throw console.error("Error creating producto:",e.error),new Error(e.error.message||"Error al crear producto");return u(s({},e.data),{stock_total:0,unidad_medida:"unidad",inventario:[]})}),d(e=>(console.error("Service error creating producto:",e),n(()=>e))))}updateProducto(o,e){return t(this.supabase.client.from("productos").update(e).eq("id",o).select(`
          *,
          inventario:inventario(
            id,
            cantidad,
            ubicacion,
            estado,
            fecha_vencimiento
          )
        `).single()).pipe(c(r=>{if(r.error)throw console.error("Error updating producto:",r.error),new Error(r.error.message||"Error al actualizar producto");return r.data}),d(r=>(console.error("Service error updating producto:",r),n(()=>r))))}getMovimientos(o){let e=this.supabase.client.from("movimientos_inventario").select(`
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
      `).order("fecha",{ascending:!1});return o?.fecha_desde&&(e=e.gte("fecha",o.fecha_desde)),o?.fecha_hasta&&(e=e.lte("fecha",o.fecha_hasta)),o?.tipo&&(e=e.eq("tipo",o.tipo)),o?.producto_id&&(e=e.eq("producto_id",o.producto_id)),o?.usuario_id&&(e=e.eq("usuario_id",o.usuario_id)),t(e).pipe(c(r=>{if(r.error)throw console.error("Error fetching movimientos:",r.error),new Error(r.error.message||"Error al cargar movimientos");return(r.data||[]).map(i=>u(s({},i),{created_at:i.fecha,ubicacion_origen:i.ubicacion_origen||"",ubicacion_destino:i.ubicacion_destino||"",observaciones:i.observaciones||"",referencia:i.referencia||"",lote:i.lote||"",fecha_vencimiento:i.fecha_vencimiento||""}))}),d(r=>(console.error("Service error fetching movimientos:",r),n(()=>r))))}registrarMovimiento(o){return t(this.supabase.client.auth.getUser()).pipe(p(e=>{let r=e.data.user;if(!r)throw new Error("Usuario no autenticado");let a={inventario_id:o.inventario_id,producto_id:o.producto_id,tipo:o.tipo,cantidad:o.cantidad,motivo:o.motivo||"",usuario_id:r.id};return t(this.supabase.client.from("movimientos_inventario").insert([a]).select(`
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
            `).single())}),c(e=>{if(e.error)throw console.error("Error registrando movimiento:",e.error),new Error(e.error.message||"Error al registrar movimiento");return u(s({},e.data),{created_at:e.data.fecha})}),d(e=>(console.error("Service error registrando movimiento:",e),n(()=>e))))}getResumenMovimientos(o,e){return t(this.supabase.client.rpc("get_resumen_movimientos",{fecha_desde:o,fecha_hasta:e})).pipe(c(r=>{if(r.error)throw console.error("Error fetching resumen:",r.error),new Error(r.error.message||"Error al cargar resumen");return r.data||{}}),d(r=>(console.error("Service error fetching resumen:",r),n(()=>r))))}getTiposMovimiento(){return[{value:"entrada",label:"Entrada",icon:"\u2795",color:"text-green-600"},{value:"salida",label:"Salida",icon:"\u2796",color:"text-red-600"},{value:"ajuste",label:"Ajuste",icon:"\u2696\uFE0F",color:"text-blue-600"},{value:"transferencia",label:"Transferencia",icon:"\u{1F504}",color:"text-purple-600"}]}getMotivosComunes(){return{entrada:["Compra","Donaci\xF3n","Devoluci\xF3n","Ajuste de inventario","Transferencia recibida"],salida:["Uso en cirug\xEDa","Venta","Donaci\xF3n","P\xE9rdida","Vencimiento","Transferencia enviada"],ajuste:["Correcci\xF3n de stock","Inventario f\xEDsico","Error de sistema"],transferencia:["Redistribuci\xF3n de stock","Cambio de ubicaci\xF3n","Optimizaci\xF3n de inventario"]}}generateProductCode(o){let r={implantes:"IMP",instrumentos:"INS",consumibles:"CON",equipos:"EQU",medicamentos:"MED"}[o]||"PRD",a=Date.now().toString().slice(-6);return`${r}-${a}`}getCategorias(){return["implantes","instrumentos","consumibles","equipos","medicamentos"]}getUbicaciones(){return["sede_principal","bodega","sede_secundaria"]}getUbicacionesOrganizadas(){return{ubicaciones:[{value:"sede_principal",label:"Sede Principal"},{value:"bodega",label:"Bodega"},{value:"sede_secundaria",label:"Sede Secundaria"}]}}getUnidadesMedida(){return["unidad","caja","paquete","metro","kilogramo","litro","mililitro","gramo"]}static \u0275fac=function(e){return new(e||l)};static \u0275prov=g({token:l,factory:l.\u0275fac,providedIn:"root"})};export{f as a};
