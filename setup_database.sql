-- ==========================================
-- SCRIPT DE CORRECCIÓN DE PUNTOS Y PERMISOS
-- ==========================================
-- Ejecuta este script en el Editor SQL de Supabase para corregir
-- el problema de que los puntos no se guardan.

-- 1. Función RPC Segura (SECURITY DEFINER)
-- Esta función se ejecuta con permisos de administrador, permitiendo
-- a los registradores actualizar el saldo de los alumnos.
CREATE OR REPLACE FUNCTION add_transaction_and_update_points(
  p_student_id UUID,
  p_amount NUMERIC,
  p_description TEXT,
  p_registar_by UUID,
  p_new_points NUMERIC,   -- Ignorado, recalculamos dentro para seguridad
  p_client_tx_id TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER -- ¡CRÍTICO! Permite saltarse las restricciones RLS normales
AS $$
DECLARE
  v_current_points NUMERIC;
  v_current_lifetime NUMERIC;
BEGIN
  -- 1. Insertar la transacción (Historial)
  INSERT INTO transactions (student_id, amount, description, registar_by, created_at, client_tx_id)
  VALUES (p_student_id, p_amount, p_description, p_registar_by, NOW(), p_client_tx_id);

  -- 2. Actualizar el Perfil (Saldo y Ranking)
  -- Usamos una actualización atómica directa
  IF p_amount > 0 THEN
    -- Si son puntos positivos (Registro de botellas)
    -- Sumamos al saldo actual y al acumulado histórico (Ranking)
    UPDATE profiles
    SET points = COALESCE(points, 0) + p_amount,
        lifetime_points = COALESCE(lifetime_points, 0) + p_amount
    WHERE id = p_student_id;
  ELSE
    -- Si son puntos negativos (Canje)
    -- Solo restamos del saldo actual. El ranking histórico NO debe bajar.
    UPDATE profiles
    SET points = COALESCE(points, 0) + p_amount -- p_amount ya viene negativo
    WHERE id = p_student_id;
  END IF;
END;
$$;

-- 2. Asegurar Permisos de Lectura para Ranking
-- Permitir que cualquiera vea los nombres y puntos (necesario para el Ranking)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
CREATE POLICY "Public profiles are viewable by everyone"
ON profiles FOR SELECT
USING (true);

-- 3. Asegurar Permisos de Inserción de Transacciones
-- Permitir a usuarios autenticados (como registradores) crear transacciones
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON transactions;
CREATE POLICY "Enable insert for authenticated users only"
ON transactions FOR INSERT
TO authenticated
WITH CHECK (true);

-- 4. PERMISOS PARA AVATARES (NUEVO)
-- Permitir que los usuarios actualicen su propia foto en la tabla profiles
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);

-- Permitir acceso público al bucket de avatares (si no existe)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de Storage para 'avatars'
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );

DROP POLICY IF EXISTS "Anyone can upload an avatar" ON storage.objects;
CREATE POLICY "Anyone can upload an avatar"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'avatars' );

DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'avatars' AND auth.uid() = owner );
