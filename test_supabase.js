const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://rbtdahmhaksdvupsmkma.supabase.co';
const supabaseKey = 'sb_publishable_GP8roaav6iIHoQfFp7ncBg_slCdxC7S';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.from('solicitudes').insert([{
          fecha: '2026-07-01',
          nombre: 'Test',
          telefono: '1234',
          puesto: 'Test',
          tipo: 'Test',
          desde: '2026-07-01',
          hasta: '2026-07-01',
          hora: '10:00 a 11:00',
          total: '1 horas',
          motivo: 'Test',
          justificacion: 'Test',
          reemplazo: 'Test'
  }]);
  console.log("Error sin contactoEmergencia:", error);
}
test();
