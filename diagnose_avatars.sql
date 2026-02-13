-- =======================================================
-- SCRIPT DE DIAGNÓSTICO DE AVATARES
-- =======================================================
-- Ejecuta este script y copia el contenido del panel "Messages" o "Results".

DO $$
DECLARE
    r RECORD;
    v_files_count INT;
    v_profiles_count INT;
BEGIN
    RAISE NOTICE '--- INICIO DIAGNÓSTICO ---';

    -- 1. Contar archivos en Storage
    SELECT count(*) INTO v_files_count FROM storage.objects WHERE bucket_id = 'avatars';
    RAISE NOTICE 'Archivos en bucket "avatars": %', v_files_count;

    -- 2. Enumerar los primeros 10 archivos encontrados
    RAISE NOTICE 'Muestra de archivos en Storage:';
    FOR r IN (SELECT name, owner, created_at FROM storage.objects WHERE bucket_id = 'avatars' LIMIT 10) LOOP
        RAISE NOTICE '  - Archivo: %, Propietario ID: %, Creado: %', r.name, r.owner, r.created_at;
    END LOOP;

    -- 3. Contar perfiles
    SELECT count(*) INTO v_profiles_count FROM profiles;
    RAISE NOTICE 'Total de perfiles en base de datos: %', v_profiles_count;

    -- 4. Mostrar perfiles que NO tienen avatar_url
    RAISE NOTICE 'Perfiles SIN avatar_url (Muestra):';
    FOR r IN (SELECT id, full_name FROM profiles WHERE avatar_url IS NULL OR avatar_url = '' LIMIT 10) LOOP
        RAISE NOTICE '  - ID: %, Nombre: %', r.id, r.full_name;
    END LOOP;
    
    -- 5. Intentar detectar discrepancias de nombre
    RAISE NOTICE '--- FIN DIAGNÓSTICO ---';
END $$;
