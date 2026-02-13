-- =======================================================
-- SCRIPT DE RECUPERACIÓN V5 (SOLUCIÓN DEFINITIVA - CORREGIDO)
-- =======================================================
-- Este script vincula las imágenes basándose en los datos de la tabla de diagnóstico.

DO $$
DECLARE
    v_project_url TEXT := 'https://ngcubmaaylrgidxmejak.supabase.co'; 
    v_count INT := 0;
BEGIN
    RAISE NOTICE 'Iniciando Recuperación V5 (Final Match)...';

    -- 1. Asegurar bucket público
    UPDATE storage.buckets SET public = true WHERE id = 'avatars';

    -- 2. Vincular fotos
    -- Corregido: Usamos el operador LIKE para PostgreSQL
    WITH repairs AS (
        SELECT 
            p.id as user_id,
            so.name as file_name
        FROM profiles p
        JOIN storage.objects so ON so.bucket_id = 'avatars'
        -- Comparamos si el nombre del archivo empieza con el ID del perfil
        WHERE so.name LIKE (p.id::text || '%')
    ),
    updates AS (
        UPDATE profiles p
        SET avatar_url = v_project_url || '/storage/v1/object/public/avatars/' || r.file_name
        FROM repairs r
        WHERE p.id = r.user_id
        RETURNING 1
    )
    SELECT count(*) INTO v_count FROM updates;

    RAISE NOTICE 'Reparación V5 finalizada. Se restauraron % avatares.', v_count;
END $$;
