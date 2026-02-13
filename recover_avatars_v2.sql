-- =======================================================
-- SCRIPT DE RECUPERACIÓN DE AVATARES V2 (FORZADO)
-- =======================================================
-- Ejecuta este script para forzar la reconexión de imágenes

DO $$
DECLARE
    v_project_url TEXT := 'https://ngcubmaaylrgidxmejak.supabase.co'; 
    v_count INT := 0;
BEGIN
    RAISE NOTICE 'Iniciando Recuperación V2...';

    -- 1. ASEGURAR QUE EL BUCKET ES PÚBLICO (CRÍTICO)
    UPDATE storage.buckets 
    SET public = true 
    WHERE id = 'avatars';
    
    -- 2. Recuperar enlaces basándose en los archivos existentes
    -- Usamos una tabla temporal para encontrar la foto MÁS RECIENTE de cada usuario
    CREATE TEMP TABLE IF NOT EXISTS latest_avatars AS
    SELECT DISTINCT ON (user_id_text)
        name as file_name,
        substring(name from 1 for 36) as user_id_text
    FROM storage.objects
    WHERE bucket_id = 'avatars'
    AND name ~ '^[0-9a-fA-F-]{36}-' -- Regex para asegurar que empieza con UUID
    ORDER BY user_id_text, created_at DESC; -- Priorizar la más nueva

    -- 3. Actualizar la tabla profiles masivamente
    WITH rows AS (
        UPDATE profiles p
        SET avatar_url = v_project_url || '/storage/v1/object/public/avatars/' || la.file_name
        FROM latest_avatars la
        WHERE p.id::text = la.user_id_text
        RETURNING 1
    )
    SELECT count(*) INTO v_count FROM rows;

    RAISE NOTICE 'ÉXITO: Se han reparado % perfiles con sus fotos recuperadas.', v_count;
    
    -- Limpieza
    DROP TABLE IF EXISTS latest_avatars;
END $$;
