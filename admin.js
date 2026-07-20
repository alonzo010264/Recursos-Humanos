document.addEventListener('DOMContentLoaded', async () => {
  const tableBody = document.getElementById('tableBody');
  const searchInput = document.getElementById('searchInput');
  const logoutBtn = document.getElementById('logoutBtn');

  // Pestañas
  const tabSolicitudes = document.getElementById('tabSolicitudes');
  const tabEmpleados = document.getElementById('tabEmpleados');
  const sectionSolicitudes = document.getElementById('sectionSolicitudes');
  const sectionEmpleados = document.getElementById('sectionEmpleados');

  tabSolicitudes.addEventListener('click', () => {
    tabSolicitudes.classList.add('active');
    tabEmpleados.classList.remove('active');
    sectionSolicitudes.style.display = 'block';
    sectionEmpleados.style.display = 'none';
  });

  tabEmpleados.addEventListener('click', () => {
    tabEmpleados.classList.add('active');
    tabSolicitudes.classList.remove('active');
    sectionSolicitudes.style.display = 'none';
    sectionEmpleados.style.display = 'block';
    fetchEmpleados();
  });

  // Inicializar Supabase
  const supabaseUrl = 'https://rbtdahmhaksdvupsmkma.supabase.co';
  const supabaseKey = 'sb_publishable_GP8roaav6iIHoQfFp7ncBg_slCdxC7S';
  let supabase = null;
  if (window.supabase) {
    supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
  }

  let solicitudes = [];
  let empleados = [];

  // --- SOLICITUDES ---
  async function fetchSolicitudes() {
    try {
      const res = await fetch('/api/solicitudes');
      if (res.status === 401) {
        window.location.href = '/login';
        return;
      }
      
      if (supabase) {
        const { data, error } = await supabase
          .from('solicitudes')
          .select('*')
          .order('id', { ascending: false });
          
        if (error) throw error;
        solicitudes = data || [];
      } else {
        const json = await res.json();
        solicitudes = json.data || [];
      }
      renderTable(solicitudes);
    } catch (error) {
      console.error(error);
      tableBody.innerHTML = `<tr><td colspan="7" class="loading">Error al cargar los datos</td></tr>`;
    }
  }

  function renderTable(data) {
    if (data.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="7" class="loading">No hay solicitudes registradas</td></tr>`;
      return;
    }

    tableBody.innerHTML = data.map(item => {
      const descontar = item.descontarVacaciones || item.descontarvacaciones;
      return `
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
          ${descontar ? `<div class="text-sm" style="margin-top:5px; color:${descontar === 'Si' ? '#d32f2f' : '#388e3c'}; font-weight: 500;">
            Vacaciones: ${descontar === 'Si' ? 'Descontar' : 'No descontar'}
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
      `;
    }).join('');
  }

  // Descargar Word
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
          .title { font-size: 20px; font-weight: bold; text-align: center; margin-bottom: 10px; text-transform: uppercase; }
          .field { margin-bottom: 8px; font-size: 14px; }
          .field strong { color: #000; }
          .box { border: 1px solid #ccc; padding: 10px; margin-top: 5px; background: #fafafa; min-height: 40px; font-size: 14px; }
          .firmas { width: 100%; margin-top: 40px; text-align: center; page-break-inside: avoid; }
          .firmas td { width: 50%; padding-top: 10px; }
        </style>
      </head>
      <body>
        <div style="text-align: center;">
          <img src="${logoUrl}" alt="IVAD" width="160" height="124" />
          <div class="title">SOLICITUD DE PERMISO</div>
        </div>
        <hr style="border: 0; border-top: 2px solid #000; margin: 10px 0 15px 0;" />
        
        <div class="field"><strong>Colaborador:</strong> ${item.nombre}</div>
        <div class="field"><strong>Puesto:</strong> ${item.puesto}</div>
        <div class="field"><strong>Teléfono:</strong> ${item.telefono}</div>
        <hr style="border: 0; border-top: 1px dashed #ccc; margin: 10px 0;" />
        <div class="field"><strong>Tipo de permiso:</strong> ${item.tipo}</div>
        <div class="field"><strong>Fechas:</strong> del ${item.desde} al ${item.hasta}</div>
        <div class="field"><strong>Horario:</strong> ${item.hora}</div>
        <div class="field"><strong>Total solicitado:</strong> ${item.total}</div>
        <div class="field"><strong>¿Descontar de vacaciones?:</strong> ${item.descontarVacaciones || item.descontarvacaciones || 'N/A'}</div>
        <hr style="border: 0; border-top: 1px dashed #ccc; margin: 10px 0;" />
        <div class="field"><strong>Motivo principal:</strong></div>
        <div class="box">${item.motivo}</div>
        <div style="margin-top: 10px;"></div>
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

  // --- EMPLEADOS ---
  const empleadosGrid = document.getElementById('empleadosGrid');

  async function fetchEmpleados() {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('empleados')
        .select('*')
        .order('nombre', { ascending: true });
        
      if (error) throw error;
      
      empleados = data || [];
      
      // Auto-restablecimiento (Lazy Reset)
      const todayStr = new Date().toISOString().split('T')[0];
      const expired = empleados.filter(emp => emp.en_vacaciones && emp.fecha_fin_vacaciones && emp.fecha_fin_vacaciones < todayStr);
      
      if (expired.length > 0) {
        for (const emp of expired) {
          await supabase.from('empleados').update({
            en_vacaciones: false,
            fecha_inicio_vacaciones: null,
            fecha_fin_vacaciones: null
          }).eq('id', emp.id);
        }
        // Recargar con los estados restablecidos
        return fetchEmpleados();
      }

      renderEmpleados(empleados);
    } catch (err) {
      console.error(err);
      empleadosGrid.innerHTML = `<div class="loading" style="grid-column: 1 / -1; color:#d32f2f;">Error al cargar los colaboradores</div>`;
    }
  }

  function renderEmpleados(data) {
    if (data.length === 0) {
      empleadosGrid.innerHTML = `<div class="loading" style="grid-column: 1 / -1;">No hay colaboradores registrados. ¡Registra uno nuevo arriba!</div>`;
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    empleadosGrid.innerHTML = data.map(emp => {
      let progressHTML = '';
      let cardActionsHTML = '';

      if (emp.en_vacaciones) {
        const start = new Date(emp.fecha_inicio_vacaciones);
        const end = new Date(emp.fecha_fin_vacaciones);
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);

        const totalDuration = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);
        const elapsed = Math.max(0, Math.round((today - start) / (1000 * 60 * 60 * 24)));
        const percent = Math.min(100, Math.round((elapsed / totalDuration) * 100));

        progressHTML = `
          <div class="vac-progress-wrap">
            <span class="vac-active-badge">En Vacaciones ✈️</span>
            <div class="vac-label-row" style="margin-top: 8px;">
              <span>Regreso: ${new Date(emp.fecha_fin_vacaciones).toLocaleDateString('es-ES')}</span>
              <span>Día ${Math.min(totalDuration, elapsed + 1)} de ${totalDuration}</span>
            </div>
            <div class="vac-bar-bg">
              <div class="vac-bar-fill" style="width: ${percent}%; background:#2e7d32;"></div>
            </div>
          </div>
        `;

        cardActionsHTML = `
          <button class="btn btn-secondary btn-card-action" style="border-color:#d32f2f; color:#d32f2f;" onclick="window.finalizarVacaciones(${emp.id})">
            🛑 Finalizar Vacaciones
          </button>
        `;
      } else {
        const percentAvailable = Math.round((emp.vacaciones_disponibles / emp.vacaciones_totales) * 100);
        progressHTML = `
          <div class="vac-progress-wrap">
            <div class="vac-label-row">
              <span>Vacaciones Disponibles</span>
              <span>${emp.vacaciones_disponibles} / ${emp.vacaciones_totales} días</span>
            </div>
            <div class="vac-bar-bg">
              <div class="vac-bar-fill" style="width: ${percentAvailable}%;"></div>
            </div>
          </div>
        `;

        cardActionsHTML = `
          <button class="btn-card-action" onclick="window.abrirModalVacaciones(${emp.id}, '${emp.nombre.replace(/'/g, "\\'")}')">
            ✈️ Tomar Vacaciones
          </button>
        `;
      }

      return `
        <div class="employee-card">
          <div class="emp-header">
            <div class="emp-name">${emp.nombre}</div>
            <div class="emp-puesto">${emp.puesto}</div>
          </div>
          <div class="emp-details">
            📞 ${emp.telefono || 'Sin teléfono'}<br/>
            ${progressHTML}
          </div>
          <div style="display:flex; flex-direction:column; gap:6px;">
            ${cardActionsHTML}
            <div style="display:flex; gap:6px; margin-top:8px;">
              <button class="btn btn-secondary" style="flex:1; padding:6px; font-size:12px;" onclick="window.abrirModalEditarEmpleado(${emp.id})">Editar</button>
              <button class="btn btn-danger" style="flex:1; padding:6px; font-size:12px;" onclick="window.eliminarEmpleado(${emp.id})">Eliminar</button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // --- CRUD COLABORADORES ---
  const modalEmpleado = document.getElementById('modalEmpleado');
  const formEmpleado = document.getElementById('formEmpleado');
  const modalEmpleadoTitle = document.getElementById('modalEmpleadoTitle');

  document.getElementById('btnNuevoEmpleado').addEventListener('click', () => {
    formEmpleado.reset();
    document.getElementById('empId').value = '';
    modalEmpleadoTitle.textContent = "Registrar Nuevo Colaborador";
    modalEmpleado.classList.add('active');
  });

  const closeModalEmpleado = () => modalEmpleado.classList.remove('active');
  document.getElementById('closeModalEmpleado').addEventListener('click', closeModalEmpleado);
  document.getElementById('btnCancelarEmpleado').addEventListener('click', closeModalEmpleado);

  formEmpleado.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('empId').value;
    const nombre = document.getElementById('empNombre').value.trim();
    const puesto = document.getElementById('empPuesto').value.trim();
    const telefono = document.getElementById('empTelefono').value.trim();
    const vacaciones_totales = parseFloat(document.getElementById('empVacTotales').value) || 0;
    const vacaciones_disponibles = parseFloat(document.getElementById('empVacDisponibles').value) || 0;

    const payload = { nombre, puesto, telefono, vacaciones_totales, vacaciones_disponibles };

    try {
      if (id) {
        // Editar
        const { error } = await supabase.from('empleados').update(payload).eq('id', id);
        if (error) throw error;
      } else {
        // Nuevo
        const { error } = await supabase.from('empleados').insert([payload]);
        if (error) throw error;
      }
      closeModalEmpleado();
      fetchEmpleados();
    } catch (err) {
      alert("Error al guardar el colaborador: " + err.message);
    }
  });

  window.abrirModalEditarEmpleado = function(id) {
    const emp = empleados.find(e => e.id === id);
    if (!emp) return;

    document.getElementById('empId').value = emp.id;
    document.getElementById('empNombre').value = emp.nombre;
    document.getElementById('empPuesto').value = emp.puesto;
    document.getElementById('empTelefono').value = emp.telefono || '';
    document.getElementById('empVacTotales').value = emp.vacaciones_totales;
    document.getElementById('empVacDisponibles').value = emp.vacaciones_disponibles;

    modalEmpleadoTitle.textContent = "Editar Colaborador";
    modalEmpleado.classList.add('active');
  };

  window.eliminarEmpleado = async function(id) {
    if (!confirm("¿Seguro que deseas eliminar este colaborador?")) return;
    try {
      const { error } = await supabase.from('empleados').delete().eq('id', id);
      if (error) throw error;
      fetchEmpleados();
    } catch (err) {
      alert("Error al eliminar colaborador: " + err.message);
    }
  };

  // --- CONTROL VACACIONES ---
  const modalVacaciones = document.getElementById('modalVacaciones');
  const formVacaciones = document.getElementById('formVacaciones');

  window.abrirModalVacaciones = function(id, nombre) {
    formVacaciones.reset();
    document.getElementById('vacEmpId').value = id;
    document.getElementById('vacEmpNombre').value = nombre;
    modalVacaciones.classList.add('active');
  };

  const closeModalVacaciones = () => modalVacaciones.classList.remove('active');
  document.getElementById('closeModalVacaciones').addEventListener('click', closeModalVacaciones);
  document.getElementById('btnCancelarVacaciones').addEventListener('click', closeModalVacaciones);

  formVacaciones.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('vacEmpId').value;
    const desde = document.getElementById('vacDesde').value;
    const hasta = document.getElementById('vacHasta').value;

    try {
      const { error } = await supabase.from('empleados').update({
        en_vacaciones: true,
        fecha_inicio_vacaciones: desde,
        fecha_fin_vacaciones: hasta
      }).eq('id', id);

      if (error) throw error;
      closeModalVacaciones();
      fetchEmpleados();
    } catch (err) {
      alert("Error al iniciar vacaciones: " + err.message);
    }
  });

  window.finalizarVacaciones = async function(id) {
    if (!confirm("¿Deseas finalizar anticipadamente las vacaciones de este colaborador?")) return;
    try {
      const { error } = await supabase.from('empleados').update({
        en_vacaciones: false,
        fecha_inicio_vacaciones: null,
        fecha_fin_vacaciones: null
      }).eq('id', id);

      if (error) throw error;
      fetchEmpleados();
    } catch (err) {
      alert("Error al finalizar vacaciones: " + err.message);
    }
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

  // Carga inicial
  fetchSolicitudes().then(() => {
    if (window.supabase) {
      const supabaseRealtime = window.supabase.createClient(supabaseUrl, supabaseKey);
      
      supabaseRealtime
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
