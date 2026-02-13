-- =======================================================
-- SCRIPT DE RECUPERACIÓN DE AVATARES V3 (MÉTODO OWNER)
-- =======================================================
-- Este es el script DEFINITIVO. Usa el ID interno del propietario del archivo.

DO $$
DECLARE
    v_project_url TEXT := 'https://ngcubmaaylrgidxmejak.supabase.co'; 
    v_count INT := 0;
BEGIN
    RAISE NOTICE 'Iniciando Recuperación V3 (Owner Match)...';

    -- 1. ASEGURAR QUE EL BUCKET ES PÚBLICO (CRÍTICO)
    UPDATE storage.buckets 
    SET public = true 
    WHERE id = 'avatars';
    
    -- 2. Actualizar perfiles usando el campo OWNER de storage.objects
    -- Esto es mucho más seguro que tratar de adivinar el nombre del archivo.
    -- Buscamos el objeto más reciente subido por cada usuario.
    
    WITH latest_files AS (
        SELECT DISTINCT ON (owner)
            name as file_name,
            owner as owner_id
        FROM storage.objects
        WHERE bucket_id = 'avatars'
        AND owner IS NOT NULL
        ORDER BY owner, created_at DESC
    ),
    rows AS (
        UPDATE profiles p
        SET avatar_url = v_project_url || '/storage/v1/object/public/avatars/' || lf.file_name
        FROM latest_files lf
        WHERE p.id = lf.owner_id
        RETURNING 1
    )
    SELECT count(*) INTO v_count FROM rows;

    RAISE NOTICE 'ÉXITO V3: Se han reconectado % perfiles usando su ID de propietario.', v_count;
END $$;

-- 3. REFORZAR POLÍTICAS DE LECTURA (Por si acaso)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );
