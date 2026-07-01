document.addEventListener('DOMContentLoaded', async () => {
  const tableBody = document.getElementById('tableBody');
  const searchInput = document.getElementById('searchInput');
  const logoutBtn = document.getElementById('logoutBtn');

  let solicitudes = [];

  // Obtener datos
  async function fetchSolicitudes() {
    try {
      const res = await fetch('/api/solicitudes');
      if (res.status === 401) {
        window.location.href = '/login';
        return;
      }
      const json = await res.json();
      solicitudes = json.data;
      renderTable(solicitudes);
    } catch (error) {
      tableBody.innerHTML = `<tr><td colspan="6" class="loading">Error al cargar los datos</td></tr>`;
    }
  }

  function renderTable(data) {
    if (data.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="6" class="loading">No hay solicitudes registradas</td></tr>`;
      return;
    }

    tableBody.innerHTML = data.map(item => `
      <tr>
        <td><strong>#${item.id}</strong></td>
        <td>
          ${new Date(item.timestamp || item.created_at || new Date()).toLocaleDateString('es-ES')}
          <div class="text-sm">${new Date(item.timestamp || item.created_at || new Date()).toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit'})}</div>
        </td>
        <td>
          <strong>${item.nombre}</strong>
          <div class="text-sm">${item.puesto}</div>
          <div class="text-sm">${item.telefono}</div>
        </td>
        <td>
          Del ${item.desde} al ${item.hasta}
        </td>
        <td>
          <span class="badge">${item.tipo}</span>
          <div class="text-sm">${item.total} (${item.hora})</div>
          ${item.descontarVacaciones ? `<div class="text-sm" style="margin-top:5px; color:${item.descontarVacaciones === 'Si' ? '#d32f2f' : '#388e3c'}; font-weight: 500;">
            Vacaciones: ${item.descontarVacaciones === 'Si' ? 'Descontar' : 'No descontar'}
          </div>` : ''}
        </td>
        <td style="max-width: 250px;">
          <div>${item.motivo}</div>
        </td>
        <td>
          <button class="btn-word" onclick="window.descargarWord(${item.id})" style="background: #005A9E; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold; display: flex; align-items: center; gap: 5px;">
            📄 Word
          </button>
        </td>
      </tr>
    `).join('');
  }

  // Descargar a Word
  window.descargarWord = function(id) {
    const item = solicitudes.find(s => s.id === id);
    if (!item) return;

    const logoUrl = "https://raw.githubusercontent.com/alonzo010264/Recursos-Humanos/main/Logo.png";
    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <style>
          body { font-family: 'Arial', sans-serif; padding: 20px; color: #333; }
          .title { font-size: 22px; font-weight: bold; text-align: center; margin-bottom: 20px; text-transform: uppercase; }
          .field { margin-bottom: 12px; font-size: 14px; }
          .field strong { color: #000; }
          .box { border: 1px solid #ccc; padding: 15px; margin-top: 5px; background: #fafafa; min-height: 60px; }
          .firmas { width: 100%; margin-top: 70px; text-align: center; }
          .firmas td { width: 50%; padding-top: 10px; }
          .linea { border-top: 1px solid #000; width: 80%; margin: 0 auto 5px auto; }
        </style>
      </head>
      <body>
        <div style="text-align: center;">
          <img src="${logoUrl}" alt="IVAD" width="160" height="124" />
          <div class="title">SOLICITUD DE PERMISO</div>
        </div>
        <hr style="border: 0; border-top: 2px solid #000; margin: 20px 0;" />
        
        <div class="field"><strong>Colaborador:</strong> ${item.nombre}</div>
        <div class="field"><strong>Puesto:</strong> ${item.puesto}</div>
        <div class="field"><strong>Teléfono:</strong> ${item.telefono}</div>
        <br/>
        <div class="field"><strong>Tipo de permiso:</strong> ${item.tipo}</div>
        <div class="field"><strong>Fechas:</strong> del ${item.desde} al ${item.hasta}</div>
        <div class="field"><strong>Horario:</strong> ${item.hora}</div>
        <div class="field"><strong>Total solicitado:</strong> ${item.total}</div>
        <div class="field"><strong>¿Descontar de vacaciones?:</strong> ${item.descontarVacaciones || 'N/A'}</div>
        <br/>
        <div class="field"><strong>Motivo principal:</strong></div>
        <div class="box">${item.motivo}</div>
        <br/>
        <div class="field"><strong>Justificación adicional:</strong> ${item.justificacion || '-'}</div>
        <div class="field"><strong>Reemplazo sugerido:</strong> ${item.reemplazo || '-'}</div>
        
        <table class="firmas" cellspacing="0" cellpadding="0">
          <tr>
            <td>
              _________________________________<br/>
              <strong>Firma del Colaborador</strong><br/>
              ${item.nombre}
            </td>
            <td>
              _________________________________<br/>
              <strong>Firma de Aprobación (Jefe/Encargado)</strong><br/>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Solicitud_Permiso_${item.nombre.replace(/ /g, '_')}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Búsqueda
  searchInput.addEventListener('input', (e) => {
    const text = e.target.value.toLowerCase();
    const filtered = solicitudes.filter(s => 
      s.nombre.toLowerCase().includes(text) || 
      s.puesto.toLowerCase().includes(text)
    );
    renderTable(filtered);
  });

  // Logout
  logoutBtn.addEventListener('click', async () => {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/login';
  });

  fetchSolicitudes().then(() => {
    // Inicializar Supabase para tiempo real (mismas credenciales públicas)
    const supabaseUrl = 'https://rbtdahmhaksdvupsmkma.supabase.co';
    const supabaseKey = 'sb_publishable_GP8roaav6iIHoQfFp7ncBg_slCdxC7S';
    
    if (window.supabase) {
      const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
      
      supabase
        .channel('solicitudes_changes_web')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'solicitudes',
          },
          (payload) => {
            solicitudes.unshift(payload.new);
            renderTable(solicitudes);
          }
        )
        .subscribe();
    }
  });
});
