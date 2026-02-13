-- Función para añadir puntos de forma atómica y segura
-- Evita triggers y condiciones de carrera
CREATE OR REPLACE FUNCTION public.atomic_add_points(
    p_student_id UUID,
    p_amount INT,
    p_description TEXT,
    p_registar_by UUID,
    p_client_tx_id TEXT DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    transaction_id BIGINT,
    new_points INT
)
LANGUAGE plpgsql
SECURITY DEFINER -- Ejecutar con los permisos del rol de la base de datos
AS $$
DECLARE
    current_points INT;
    new_transaction_id BIGINT;
BEGIN
    -- Bloquear la fila del perfil para evitar condiciones de carrera
    SELECT points INTO current_points
    FROM public.profiles
    WHERE id = p_student_id
    FOR UPDATE;

    -- Si el perfil no existe, devolver error
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'Perfil de estudiante no encontrado.', NULL::BIGINT, NULL::INT;
        RETURN;
    END IF;

    -- Insertar la nueva transacción
    INSERT INTO public.transactions (student_id, amount, description, registar_by, client_tx_id)
    VALUES (p_student_id, p_amount, p_description, p_registar_by, p_client_tx_id)
    RETURNING id INTO new_transaction_id;

    -- Actualizar los puntos del usuario
    UPDATE public.profiles
    SET points = points + p_amount
    WHERE id = p_student_id;

    -- Obtener los nuevos puntos
    SELECT points INTO current_points
    FROM public.profiles
    WHERE id = p_student_id;

    -- Devolver éxito
    RETURN QUERY SELECT TRUE, 'Transacción completada.', new_transaction_id, current_points;
    RETURN;

EXCEPTION
    WHEN OTHERS THEN
        -- En caso de cualquier error, devolver el mensaje
        RETURN QUERY SELECT FALSE, SQLERRM, NULL::BIGINT, NULL::INT;
        RETURN;
END;
$$;

-- Opcional: Crear una función similar para canjes (valida saldo)
CREATE OR REPLACE FUNCTION public.atomic_redeem_points(
    p_student_id UUID,
    p_cost INT,
    p_description TEXT,
    p_registar_by UUID,
    p_client_tx_id TEXT DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    transaction_id BIGINT,
    new_points INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_points INT;
    new_transaction_id BIGINT;
BEGIN
    -- Bloquear la fila del perfil para evitar condiciones de carrera
    SELECT points INTO current_points
    FROM public.profiles
    WHERE id = p_student_id
    FOR UPDATE;

    -- Si el perfil no existe o no tiene suficientes puntos, devolver error
    IF NOT FOUND OR current_points < p_cost THEN
        RETURN QUERY SELECT FALSE, 'Saldo insuficiente o perfil no encontrado.', NULL::BIGINT, NULL::INT;
        RETURN;
    END IF;

    -- Insertar la nueva transacción de canje
    INSERT INTO public.transactions (student_id, amount, description, registar_by, client_tx_id)
    VALUES (p_student_id, -p_cost, p_description, p_registar_by, p_client_tx_id)
    RETURNING id INTO new_transaction_id;

    -- Actualizar los puntos del usuario
    UPDATE public.profiles
    SET points = points - p_cost
    WHERE id = p_student_id;

    -- Obtener los nuevos puntos
    SELECT points INTO current_points
    FROM public.profiles
    WHERE id = p_student_id;

    -- Devolver éxito
    RETURN QUERY SELECT TRUE, 'Canje completado.', new_transaction_id, current_points;
    RETURN;

EXCEPTION
    WHEN OTHERS THEN
        -- En caso de cualquier error, devolver el mensaje
        RETURN QUERY SELECT FALSE, SQLERRM, NULL::BIGINT, NULL::INT;
        RETURN;
END;
$$;