
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ngcubmaaylrgidxmejak.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5nY3VibWFheWxyZ2lkeG1lamFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzMTkzMTcsImV4cCI6MjA4NDg5NTMxN30.lWKfyrLs4yopQRouRrs8yhU9pZkb9aELC1-ivNQ6jJ0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugData() {
    console.log('--- DIAGNÓSTICO DE TRANSACCIONES ---');

    // 1. Ver columnas y muestra de datos
    const { data, error } = await supabase.from('transactions').select('*').limit(1);

    if (error) {
        console.error('Error al consultar:', error);
        return;
    }

    if (data && data.length > 0) {
        console.log('Columnas encontradas:', Object.keys(data[0]));
        console.log('Muestra de datos:', data[0]);
    } else {
        console.log('La tabla está vacía.');
    }

    // 2. Probar JOIN con profiles
    console.log('\n--- PROBANDO JOINS ---');
    const { data: joinData, error: joinError } = await supabase
        .from('transactions')
        .select('*, profiles!student_id(full_name)')
        .limit(1);

    if (joinError) console.error('Error en join student_id:', joinError.message);
    else console.log('Join student_id: EXITOSO');

    const { data: perfData, error: perfError } = await supabase
        .from('transactions')
        .select('*, profiles!performer_id(full_name)')
        .limit(1);

    if (perfError) console.error('Error en join performer_id:', perfError.message);
    else console.log('Join performer_id: EXITOSO');
}

debugData();
