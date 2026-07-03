// IVAD — Encuesta de Satisfacción (standalone, sin backend)
(function () {
  const ESCALA = [
    { v: 1, l: "Mal servicio" },
    { v: 2, l: "Regular" },
    { v: 3, l: "Bueno" },
    { v: 4, l: "Muy bueno" },
    { v: 5, l: "Excepcional" },
  ];

  const $ = (id) => document.getElementById(id);
  const form = $("survey");
  const success = $("success");
  const submitBtn = $("submitBtn");
  const errorEl = $("error");

  // Fecha por defecto
  $("fecha").value = new Date().toISOString().slice(0, 10);

  // Estrellas
  const starsWrap = $("stars");
  const starsLabel = $("starsLabel");
  const califInput = $("calificacion");
  let calif = 0, hover = 0;

  const starSVG = `<svg viewBox="0 0 24 24"><path d="M12 2.5l2.9 6.6 7.1.7-5.4 4.9 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 9.8l7.1-.7L12 2.5z"/></svg>`;

  ESCALA.forEach(({ v }) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "star-btn";
    b.setAttribute("aria-label", v + " estrellas");
    b.dataset.v = v;
    b.innerHTML = starSVG;
    b.addEventListener("mouseenter", () => { hover = v; paint(); });
    b.addEventListener("click", () => { calif = v; califInput.value = v; paint(); validate(); });
    starsWrap.appendChild(b);
  });
  starsWrap.addEventListener("mouseleave", () => { hover = 0; paint(); });

  function paint() {
    const shown = hover || calif;
    starsWrap.querySelectorAll(".star-btn").forEach((el) => {
      el.classList.toggle("active", Number(el.dataset.v) <= shown);
    });
    if (hover) {
      starsLabel.textContent = ESCALA.find((e) => e.v === hover).l;
    } else if (calif) {
      starsLabel.innerHTML = `<strong>${calif}/5 · ${ESCALA.find((e) => e.v === calif).l}</strong>`;
    } else {
      starsLabel.textContent = "Toca una estrella para calificar";
    }
  }

  // Recomienda
  let recomienda = "";
  const recWrap = $("recommend");
  recWrap.addEventListener("change", (e) => {
    if (e.target.name === "recomienda") {
      recomienda = e.target.value;
      recWrap.querySelectorAll("label").forEach((l) => {
        l.classList.toggle("checked", l.dataset.v === recomienda);
      });
      validate();
    }
  });

  // Validación mínima
  ["porque", "mejora"].forEach((id) => $(id).addEventListener("input", validate));
  function validate() {
    submitBtn.disabled = !(calif && recomienda && $("porque").value.trim() && $("mejora").value.trim());
  }

  // Configurar Supabase
  const supabaseUrl = 'https://rbtdahmhaksdvupsmkma.supabase.co';
  const supabaseKey = 'sb_publishable_GP8roaav6iIHoQfFp7ncBg_slCdxC7S';
  const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.hidden = true;
    if (submitBtn.disabled) return;
    
    // Cambiar texto del botón para indicar carga
    const btnOriginalText = submitBtn.textContent;
    submitBtn.textContent = "ENVIANDO...";
    submitBtn.disabled = true;

    const folio = "IVAD-SC-" + Math.random().toString(36).slice(2, 7).toUpperCase();
    
    // Obtener fecha local en formato YYYY-MM-DD
    const localDate = new Date();
    const offset = localDate.getTimezoneOffset() * 60000;
    const localISODate = (new Date(localDate - offset)).toISOString().slice(0, 10);

    const row = {
      folio,
      fecha: localISODate,
      nombre: $("nombre").value.trim(),
      telefono: $("telefono").value.trim(),
      calificacion: calif,
      recomienda: recomienda === "si",
      porque: $("porque").value.trim(),
      mejora: $("mejora").value.trim()
    };

    try {
      const { error } = await supabaseClient.from('satisfaccion').insert([row]);
      
      if (error) {
        throw error;
      }

      // Éxito
      form.hidden = true;
      $("folio").textContent = folio;
      const first = row.nombre ? row.nombre.split(" ")[0] : "";
      $("thanks").textContent = first ? `¡Gracias, ${first}!` : "¡Gracias!";
      success.hidden = false;
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      errorEl.textContent = "Error de conexión. Por favor, intenta de nuevo.";
      errorEl.hidden = false;
      submitBtn.textContent = btnOriginalText;
      submitBtn.disabled = false;
    }
  });

  $("againBtn").addEventListener("click", () => {
    form.reset();
    $("fecha").value = new Date().toISOString().slice(0, 10);
    calif = 0; hover = 0; recomienda = "";
    califInput.value = 0;
    recWrap.querySelectorAll("label").forEach((l) => l.classList.remove("checked"));
    paint();
    validate();
    success.hidden = true;
    form.hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
})();
