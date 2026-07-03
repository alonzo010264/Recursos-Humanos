const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://rbtdahmhaksdvupsmkma.supabase.co';
const supabaseKey = 'sb_publishable_GP8roaav6iIHoQfFp7ncBg_slCdxC7S';
const supabase = createClient(supabaseUrl, supabaseKey);

async function upload() {
  const { data, error } = await supabase.from('solicitudes').insert([{
    fecha: new Date().toISOString().split('T')[0],
    nombre: 'JEANNETTE A. MEJIA',
    telefono: '829-520-2210',
    puesto: 'CONTADORA',
    tipo: 'personal (Estaré participando de un retiro.)',
    desde: '2026-07-03',
    hasta: '2026-07-03',
    hora: '13:00 a 19:00',
    total: '6 horas',
    motivo: '-',
    justificacion: '-',
    reemplazo: '-'
  }]);
  
  if (error) {
    console.error("Error inserting:", error);
  } else {
    console.log("Successfully inserted!");
  }
}
upload();
