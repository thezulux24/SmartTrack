-- ═══════════════════════════════════════════════════════════════════
-- SCRIPT SIMPLE: Listar triggers y funciones (versión compacta)
-- Fecha: 2025-10-13
-- ═══════════════════════════════════════════════════════════════════

-- 1. TODAS LAS FUNCIONES
SELECT 
  '🔧 ' || p.proname AS "Función",
  pg_get_function_identity_arguments(p.oid) AS "Argumentos",
  CASE 
    WHEN p.prorettype = 'trigger'::regtype THEN '⚡ TRIGGER'
    ELSE pg_catalog.format_type(p.prorettype, NULL)
  END AS "Retorna"
FROM pg_proc p
LEFT JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prokind = 'f'
ORDER BY p.proname;

-- 2. TODOS LOS TRIGGERS
SELECT 
  '⚡ ' || t.tgname AS "Trigger",
  '📋 ' || t.tgrelid::regclass AS "Tabla",
  CASE WHEN t.tgtype & 2 = 2 THEN 'BEFORE' ELSE 'AFTER' END || ' ' ||
  CASE 
    WHEN t.tgtype & 4 = 4 THEN 'INSERT'
    WHEN t.tgtype & 8 = 8 THEN 'DELETE'
    WHEN t.tgtype & 16 = 16 THEN 'UPDATE'
  END AS "Tipo",
  '🔧 ' || p.proname AS "Función"
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE n.nspname = 'public'
  AND NOT t.tgisinternal
ORDER BY t.tgrelid::regclass::text, t.tgname;

-- 3. SOLO TRIGGERS DE COTIZACIONES
SELECT 
  '💰 ' || t.tgname AS "Trigger",
  t.tgrelid::regclass AS "Tabla",
  CASE WHEN t.tgtype & 2 = 2 THEN 'BEFORE' ELSE 'AFTER' END || ' ' ||
  CASE 
    WHEN t.tgtype & 4 = 4 THEN 'INSERT'
    WHEN t.tgtype & 8 = 8 THEN 'DELETE'
    WHEN t.tgtype & 16 = 16 THEN 'UPDATE'
  END AS "Evento",
  p.proname AS "Función Ejecuta"
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE n.nspname = 'public'
  AND NOT t.tgisinternal
  AND (c.relname LIKE '%cotizacion%' OR p.proname LIKE '%cotizacion%')
ORDER BY c.relname, t.tgname;

-- 4. CÓDIGO FUENTE DE FUNCIONES DE COTIZACIONES
SELECT 
  '📜 FUNCIÓN: ' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' AS "Definición",
  pg_get_functiondef(p.oid) AS "Código Fuente"
FROM pg_proc p
LEFT JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prokind = 'f'
  AND p.proname LIKE '%cotizacion%'
ORDER BY p.proname;
