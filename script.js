document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('permiso-form');
  const submitBtn = document.getElementById('submitBtn');
  const successDiv = document.getElementById('success');
  const successName = document.getElementById('successName');
  const folio = document.getElementById('folio');
  const resetBtn = document.getElementById('resetBtn');
  const inputs = form.querySelectorAll('input[required]:not([readonly]), textarea[required]');
  
  // Establecer fecha actual
  const fechaInput = document.getElementById('fecha');
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  fechaInput.value = `${year}-${month}-${day}`;
  
  // Mostrar fecha en la zona de firma
  const firmaFecha = document.getElementById('firmaFecha');
  if (firmaFecha) {
    firmaFecha.textContent = `${day}/${month}/${year}`;
  }
  
  // Mostrar ocultar "Otro" tipo de permiso
  const tiposRadios = document.querySelectorAll('input[name="tipo"]');
  const otroWrap = document.getElementById('otroWrap');
  
  tiposRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      if (radio.value === 'otro') {
        otroWrap.hidden = false;
        otroWrap.querySelector('input').required = true;
      } else {
        otroWrap.hidden = true;
        otroWrap.querySelector('input').required = false;
      }
    });
  });

  // Validar campos requeridos para habilitar el botón
  function checkValidity() {
    let isValid = true;
    inputs.forEach(input => {
      if (!input.checkValidity()) {
        isValid = false;
      }
    });
    
    // Check checkboxes
    const check1 = document.querySelector('input[name="anticipacion"]').checked;
    const check2 = document.querySelector('input[name="compromiso"]').checked;
    
    submitBtn.disabled = !(isValid && check1 && check2);
  }

  form.addEventListener('input', checkValidity);

  // Inicializar Supabase
  const supabaseUrl = 'https://kedvsteugbbtkvzuflhp.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtlZHZzdGV1Z2JidGt2enVmbGhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3Mzc2NDQsImV4cCI6MjA5OTMxMzY0NH0.4qxezljjSKoxD1amp2QrOl_gmQin-jg-ZIAXTw56TgY';
  let supabase = null;
  if (window.supabase) {
    supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
  }

  // Cargar y Autocompletar Empleados
  let listEmpleados = [];
  const nombreInput = document.getElementById('nombreInput');
  const puestoInput = document.getElementById('puestoInput');
  const telefonoInput = document.getElementById('telefonoInput');
  const vacacionesInfo = document.getElementById('vacacionesInfo');
  let selectedEmployee = null;

  async function loadEmpleados() {
    if (!supabase) return;
    try {
      const { data, error } = await supabase.from('empleados').select('*');
      if (error) throw error;
      listEmpleados = data || [];
      const datalist = document.getElementById('empleadosList');
      if (datalist) {
        datalist.innerHTML = listEmpleados.map(emp => `<option value="${emp.nombre}"></option>`).join('');
      }
    } catch (err) {
      console.error("Error al cargar empleados:", err);
    }
  }

  if (supabase) {
    loadEmpleados();
  }

  function getRequestedDays() {
    const totalInput = document.querySelector('input[name="total"]');
    if (!totalInput) return 0;
    const totalVal = parseFloat(totalInput.value) || 0;
    const modalidad = document.querySelector('input[name="modalidad"]:checked')?.value || 'horas';
    const descontar = document.querySelector('input[name="descontarVacaciones"]:checked')?.value || 'No';
    
    if (descontar === 'Si' && modalidad === 'dias') {
      return totalVal;
    }
    return 0;
  }

  function validateVacationsLimit() {
    if (!selectedEmployee) return;
    const requestedDays = getRequestedDays();
    if (requestedDays > selectedEmployee.vacaciones_disponibles) {
      vacacionesInfo.style.display = 'block';
      vacacionesInfo.style.color = '#d32f2f';
      vacacionesInfo.textContent = `¡Advertencia! Estás solicitando ${requestedDays} días de vacaciones, pero solo tienes ${selectedEmployee.vacaciones_disponibles} disponibles.`;
    } else {
      vacacionesInfo.style.display = 'block';
      vacacionesInfo.style.color = '#1976d2';
      vacacionesInfo.textContent = `Colaborador registrado. Vacaciones disponibles: ${selectedEmployee.vacaciones_disponibles} días de ${selectedEmployee.vacaciones_totales} totales.`;
    }
  }

  if (nombreInput) {
    nombreInput.addEventListener('input', () => {
      const val = nombreInput.value.trim().toLowerCase();
      const matched = listEmpleados.find(emp => emp.nombre.trim().toLowerCase() === val);
      if (matched) {
        selectedEmployee = matched;
        puestoInput.value = matched.puesto;
        telefonoInput.value = matched.telefono || '';
        puestoInput.readOnly = true;
        telefonoInput.readOnly = true;
        validateVacationsLimit();
      } else {
        selectedEmployee = null;
        puestoInput.readOnly = false;
        telefonoInput.readOnly = false;
        puestoInput.value = '';
        telefonoInput.value = '';
        vacacionesInfo.style.display = 'none';
      }
    });
  }

  const totalInput = document.querySelector('input[name="total"]');
  if (totalInput) {
    totalInput.addEventListener('input', validateVacationsLimit);
  }
  document.querySelectorAll('input[name="modalidad"]').forEach(r => {
    r.addEventListener('change', validateVacationsLimit);
  });
  document.querySelectorAll('input[name="descontarVacaciones"]').forEach(r => {
    r.addEventListener('change', validateVacationsLimit);
  });

  // Enviar formulario
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    submitBtn.textContent = "ENVIANDO...";

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    try {
      const response = await fetch('/api/solicitud', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error("Error al enviar la solicitud al servidor");
      }

      // Restar días de vacaciones si corresponde
      const requestedDays = getRequestedDays();
      if (selectedEmployee && requestedDays > 0 && supabase) {
        const newDays = Math.max(0, selectedEmployee.vacaciones_disponibles - requestedDays);
        await supabase.from('empleados').update({ vacaciones_disponibles: newDays }).eq('id', selectedEmployee.id);
      }

      // Éxito
      form.hidden = true;
      successDiv.hidden = false;
      successName.textContent = data.nombre.split(' ')[0] || 'Colaborador';
      folio.textContent = 'REQ-' + Math.floor(Math.random() * 10000);
      
    } catch (error) {
      alert("Hubo un problema al enviar el formulario. Por favor intenta de nuevo.");
      console.error(error);
      submitBtn.disabled = false;
      submitBtn.textContent = "ENVIAR SOLICITUD";
    }
  });

  resetBtn.addEventListener('click', () => {
    form.reset();
    form.hidden = false;
    successDiv.hidden = true;
    submitBtn.disabled = true;
    submitBtn.textContent = "ENVIAR SOLICITUD";
    puestoInput.readOnly = false;
    telefonoInput.readOnly = false;
    vacacionesInfo.style.display = 'none';
    selectedEmployee = null;
    loadEmpleados();
    checkValidity();
  });

  // Utilidad para previsualizar la pantalla de éxito sin llenar el formulario
  if (window.location.search.includes('preview=success')) {
    form.hidden = true;
    successDiv.hidden = false;
    successName.textContent = 'Alonzo';
    folio.textContent = 'REQ-7734';
  }
});
