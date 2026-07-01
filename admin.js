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
          ${new Date(item.timestamp).toLocaleDateString('es-ES')}
          <div class="text-sm">${new Date(item.timestamp).toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit'})}</div>
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
      </tr>
    `).join('');
  }

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

  fetchSolicitudes();
});
