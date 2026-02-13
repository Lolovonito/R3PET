-- =======================================================
-- SCRIPT DE RECUPERACIÓN V4 (BÚSQUEDA PROFUNDA)
-- =======================================================
-- Este script ignora el 'owner' y busca el ID del usuario DENTRO del nombre del archivo.
-- Útil si los archivos se subieron sin owner o con nombres no estándar.

DO $$
DECLARE
    v_project_url TEXT := 'https://ngcubmaaylrgidxmejak.supabase.co'; 
    v_count INT := 0;
BEGIN
    RAISE NOTICE 'Iniciando Recuperación V4 (Deep Match)...';

    -- 1. Intentar hacer match por texto contenido en el nombre
    -- Buscamos si el ID del usuario (su UUID) está contenido en algún nombre de archivo en 'avatars'
    
    WITH matched_files AS (
        SELECT 
            p.id as user_id,
            so.name as file_name
        FROM profiles p
        JOIN storage.objects so 
        ON so.bucket_id = 'avatars' 
        AND so.name LIKE ('%' || p.id::text || '%') -- Busca el ID en cualquier parte del nombre
        ORDER BY so.created_at DESC -- Preferir el más reciente
    ),
    distinct_matches AS (
        SELECT DISTINCT ON (user_id) 
            user_id, file_name 
        FROM matched_files
    ),
    rows AS (
        UPDATE profiles p
        SET avatar_url = v_project_url || '/storage/v1/object/public/avatars/' || dm.file_name
        FROM distinct_matches dm
        WHERE p.id = dm.user_id
        RETURNING 1
    )
    SELECT count(*) INTO v_count FROM rows;

    RAISE NOTICE 'Búsqueda Profunda completada. Se forzaron % actualizaciones.', v_count;
    
END $$;
