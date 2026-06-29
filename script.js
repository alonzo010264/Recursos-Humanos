document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('permiso-form');
  const submitBtn = document.getElementById('submitBtn');
  const successDiv = document.getElementById('success');
  const successName = document.getElementById('successName');
  const folio = document.getElementById('folio');
  const resetBtn = document.getElementById('resetBtn');
  const inputs = form.querySelectorAll('input[required], textarea[required]');
  
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
    checkValidity();
  });
});
