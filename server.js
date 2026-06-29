const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { Resend } = require('resend');

// Configuración de variables de entorno (para leer el .env)
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Inicializamos Resend con la clave segura
const resend = new Resend(process.env.RESEND_API_KEY);

// Middleware
app.use(cors());
app.use(express.json()); // Permite recibir JSON
app.use(express.static('./')); // Sirve los archivos HTML y CSS estáticos

// Ruta para procesar la solicitud
app.post('/api/solicitud', async (req, res) => {
  try {
    const data = req.body;

    // Aquí construimos el correo
    const asunto = `Nueva Solicitud de Permiso - ${data.nombre}`;
    const cuerpoHTML = `
      <h2>Nueva Solicitud de Permiso: ${data.nombre}</h2>
      <p><strong>Fecha de solicitud:</strong> ${data.fecha}</p>
      <p><strong>Teléfono:</strong> ${data.telefono}</p>
      <p><strong>Puesto:</strong> ${data.puesto}</p>
      <p><strong>Tipo de permiso:</strong> ${data.tipo} ${data.otroTipo ? `(${data.otroTipo})` : ''}</p>
      <p><strong>Fechas:</strong> del ${data.desde} al ${data.hasta}</p>
      <p><strong>Hora:</strong> ${data.horaInicio} a ${data.horaFin}</p>
      <p><strong>Total solicitado:</strong> ${data.total} ${data.modalidad}</p>
      <br>
      <p><strong>Motivo:</strong> ${data.motivo}</p>
      <p><strong>Justificación:</strong> ${data.justificacion}</p>
      <p><strong>Reemplazo:</strong> ${data.reemplazo}</p>
      <p><strong>Contacto Emergencia:</strong> ${data.contactoEmergencia}</p>
    `;

    // Envío del correo usando Resend
    const { data: responseData, error } = await resend.emails.send({
      from: 'Recursos Humanos <onboarding@resend.dev>', // Por defecto en pruebas
      to: process.env.CORREO_DESTINO,
      subject: asunto,
      html: cuerpoHTML,
    });

    if (error) {
      console.error("Error al enviar con Resend:", error);
      return res.status(500).json({ error: error.message });
    }

    res.status(200).json({ mensaje: 'Solicitud enviada correctamente', data: responseData });
  } catch (error) {
    console.error("Error del servidor:", error);
    res.status(500).json({ error: 'Hubo un error en el servidor.' });
  }
});

app.listen(port, () => {
  console.log(`Servidor de Recursos Humanos corriendo en http://localhost:${port}`);
});
