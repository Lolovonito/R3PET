-- =======================================================
-- SCRIPT DE RECUPERACIÓN DE AVATARES (REPAIR AVATARS)
-- =======================================================
-- Ejecuta este script si tus usuarios ya subieron fotos pero
-- no aparecen en el perifl o ranking debido a permisos faltantes.

DO $$
DECLARE
    -- URL de tu proyecto Supabase (EXTRAÍDO AUTOMÁTICAMENTE DE TU CONFIG)
    v_project_url TEXT := 'https://ngcubmaaylrgidxmejak.supabase.co'; 
    v_updated_count INT := 0;
BEGIN
    RAISE NOTICE 'Iniciando recuperación de avatares...';

    -- Actualizar perfiles que no tienen avatar_url pero sí tienen archivo en storage
    -- 1. Buscamos archivos en el bucket 'avatars'
    -- 2. Extraemos el UUID del nombre del archivo (formato: UUID-timestamp.ext)
    -- 3. Actualizamos la tabla profiles si coincide el ID
    
    WITH target_files AS (
        SELECT 
            name as file_name,
            -- Extraer UUID: Tomamos la parte antes del primer guion '-'
            -- Ojo: UUID tiene guiones, así que mejor tomamos los primeros 36 caracteres si el formato es estándar
            -- O si usamos el formato nuestro: userId-timestamp.ext
            -- El userId es un UUID (36 chars).
            substring(name from 1 for 36) as user_id
        FROM storage.objects
        WHERE bucket_id = 'avatars'
    ),
    updates AS (
        UPDATE profiles p
        SET avatar_url = v_project_url || '/storage/v1/object/public/avatars/' || tf.file_name
        FROM target_files tf
        WHERE p.id::text = tf.user_id
        AND (p.avatar_url IS NULL OR p.avatar_url = '') -- Solo si no tiene avatar o está vacío
        RETURNING p.id
    )
    SELECT count(*) INTO v_updated_count FROM updates;

    RAISE NOTICE 'Proceso completado. Perfiles actualizados: %', v_updated_count;
END $$;
