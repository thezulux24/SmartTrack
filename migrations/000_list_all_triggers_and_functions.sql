-- ═══════════════════════════════════════════════════════════════════
-- SCRIPT DE DIAGNÓSTICO: Listar todos los triggers y funciones
-- Fecha: 2025-10-13
-- Descripción: Muestra todos los triggers, funciones y sus definiciones
-- ═══════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════
-- 1. FUNCIONES (FUNCTIONS)
-- ═══════════════════════════════════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════════';
  RAISE NOTICE '📋 FUNCIONES DEFINIDAS EN EL SCHEMA PUBLIC';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;

SELECT 
  p.proname AS "Nombre de la Función",
  pg_get_function_identity_arguments(p.oid) AS "Argumentos",
  CASE 
    WHEN p.prorettype = 'trigger'::regtype THEN 'TRIGGER'
    ELSE pg_catalog.format_type(p.prorettype, NULL)
  END AS "Tipo de Retorno",
  l.lanname AS "Lenguaje",
  CASE p.provolatile
    WHEN 'i' THEN 'IMMUTABLE'
    WHEN 's' THEN 'STABLE'
    WHEN 'v' THEN 'VOLATILE'
  END AS "Volatilidad"
FROM pg_proc p
LEFT JOIN pg_namespace n ON n.oid = p.pronamespace
LEFT JOIN pg_language l ON l.oid = p.prolang
WHERE n.nspname = 'public'
  AND p.prokind = 'f'  -- Solo funciones (no procedimientos)
ORDER BY p.proname;

-- ═══════════════════════════════════════════════════════════════════
-- 2. TRIGGERS
-- ═══════════════════════════════════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════════';
  RAISE NOTICE '⚡ TRIGGERS DEFINIDOS EN EL SCHEMA PUBLIC';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;

SELECT 
  tgname AS "Nombre del Trigger",
  tgrelid::regclass AS "Tabla",
  CASE 
    WHEN tgtype & 2 = 2 THEN 'BEFORE'
    WHEN tgtype & 64 = 64 THEN 'INSTEAD OF'
    ELSE 'AFTER'
  END AS "Timing",
  CASE 
    WHEN tgtype & 4 = 4 THEN 'INSERT'
    WHEN tgtype & 8 = 8 THEN 'DELETE'
    WHEN tgtype & 16 = 16 THEN 'UPDATE'
    WHEN tgtype & 32 = 32 THEN 'TRUNCATE'
  END AS "Evento",
  CASE 
    WHEN tgtype & 1 = 1 THEN 'ROW'
    ELSE 'STATEMENT'
  END AS "Nivel",
  p.proname AS "Función Asociada",
  tgenabled AS "Habilitado"
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE n.nspname = 'public'
  AND NOT t.tgisinternal  -- Excluir triggers internos de sistema
ORDER BY tgrelid::regclass::text, tgname;

-- ═══════════════════════════════════════════════════════════════════
-- 3. DEFINICIONES COMPLETAS DE FUNCIONES
-- ═══════════════════════════════════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════════';
  RAISE NOTICE '📜 CÓDIGO FUENTE DE FUNCIONES';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;

-- Mostrar el código de cada función
DO $$
DECLARE
  func_record RECORD;
  func_definition TEXT;
BEGIN
  FOR func_record IN 
    SELECT 
      p.oid,
      p.proname,
      pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    LEFT JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
    ORDER BY p.proname
  LOOP
    -- Obtener la definición completa
    SELECT pg_get_functiondef(func_record.oid) INTO func_definition;
    
    RAISE NOTICE '';
    RAISE NOTICE '─────────────────────────────────────────────────────────────────';
    RAISE NOTICE '🔧 FUNCIÓN: %(%)', func_record.proname, func_record.args;
    RAISE NOTICE '─────────────────────────────────────────────────────────────────';
    RAISE NOTICE '%', func_definition;
    RAISE NOTICE '';
  END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════════
-- 4. RESUMEN EJECUTIVO
-- ═══════════════════════════════════════════════════════════════════

DO $$
DECLARE
  total_funciones INTEGER;
  total_triggers INTEGER;
  funciones_trigger INTEGER;
BEGIN
  -- Contar funciones
  SELECT COUNT(*) INTO total_funciones
  FROM pg_proc p
  LEFT JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.prokind = 'f';
  
  -- Contar triggers
  SELECT COUNT(*) INTO total_triggers
  FROM pg_trigger t
  JOIN pg_class c ON t.tgrelid = c.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public'
    AND NOT t.tgisinternal;
  
  -- Contar funciones de tipo TRIGGER
  SELECT COUNT(*) INTO funciones_trigger
  FROM pg_proc p
  LEFT JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.prokind = 'f'
    AND p.prorettype = 'trigger'::regtype;
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════════';
  RAISE NOTICE '📊 RESUMEN';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════════';
  RAISE NOTICE '📋 Total de Funciones: %', total_funciones;
  RAISE NOTICE '⚙️  Funciones de Trigger: %', funciones_trigger;
  RAISE NOTICE '⚡ Total de Triggers: %', total_triggers;
  RAISE NOTICE '═══════════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;

-- ═══════════════════════════════════════════════════════════════════
-- 5. TRIGGERS RELACIONADOS CON COTIZACIONES (ESPECÍFICO)
-- ═══════════════════════════════════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════════';
  RAISE NOTICE '💰 TRIGGERS Y FUNCIONES DE COTIZACIONES';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;

SELECT 
  t.tgname AS "Trigger",
  t.tgrelid::regclass AS "Tabla",
  p.proname AS "Función",
  CASE 
    WHEN t.tgtype & 2 = 2 THEN 'BEFORE'
    ELSE 'AFTER'
  END || ' ' ||
  CASE 
    WHEN t.tgtype & 4 = 4 THEN 'INSERT'
    WHEN t.tgtype & 8 = 8 THEN 'DELETE'
    WHEN t.tgtype & 16 = 16 THEN 'UPDATE'
  END AS "Tipo"
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE n.nspname = 'public'
  AND NOT t.tgisinternal
  AND (
    c.relname LIKE '%cotizacion%' OR 
    p.proname LIKE '%cotizacion%'
  )
ORDER BY c.relname, t.tgname;

-- ═══════════════════════════════════════════════════════════════════
-- FIN DEL SCRIPT DE DIAGNÓSTICO
-- ═══════════════════════════════════════════════════════════════════
