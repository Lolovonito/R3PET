-- =======================================================
-- SCRIPT DE DIAGNÓSTICO DE AVATARES (VERSIÓN TABLA)
-- =======================================================
-- Ejecuta este script y copia la TABLA de resultados aquí.

-- 1. Ver qué hay en el storage y compararlo con perfiles
SELECT 
    'STORAGE_FILE' as tipo,
    name as identificador,
    owner::text as info_extra,
    created_at::text as fecha
FROM storage.objects 
WHERE bucket_id = 'avatars'

UNION ALL

SELECT 
    'PROFILE_USER' as tipo,
    id::text as identificador,
    full_name as info_extra,
    avatar_url as fecha -- Usamos el campo fecha para mostrar la URL actual
FROM profiles 
WHERE avatar_url IS NULL OR avatar_url = ''
LIMIT 20;
