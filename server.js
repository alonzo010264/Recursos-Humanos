const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { Resend } = require('resend');
const sqlite3 = require('sqlite3').verbose();
const session = require('express-session');
const path = require('path');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Inicializamos Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Configuración de Sesiones para el Login
app.use(session({
  secret: process.env.SESSION_SECRET || 'secreto_seguro',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // en producción con https debería ser true
}));

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Inicializar Base de Datos SQLite
const db = new sqlite3.Database('./database.sqlite', (err) => {
  if (err) {
    console.error("Error al conectar con la base de datos", err.message);
  } else {
    console.log("Conectado a la base de datos SQLite.");
    db.run(`CREATE TABLE IF NOT EXISTS solicitudes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT,
      nombre TEXT,
      telefono TEXT,
      puesto TEXT,
      tipo TEXT,
      desde TEXT,
      hasta TEXT,
      hora TEXT,
      total TEXT,
      motivo TEXT,
      justificacion TEXT,
      reemplazo TEXT,
      contactoEmergencia TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
  }
});

// Middleware de Autenticación
function requireAuth(req, res, next) {
  if (req.session.autenticado) {
    next();
  } else {
    res.redirect('/login.html');
  }
}

// Rutas estáticas para la web pública (excepto admin)
app.use(express.static('./', { index: false }));

// Ruta principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Rutas protegidas para el panel de administración
app.get('/admin.html', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});
app.get('/admin.css', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.css'));
});
app.get('/admin.js', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.js'));
});

app.get('/login.html', (req, res) => {
  if (req.session.autenticado) return res.redirect('/admin.html');
  res.sendFile(path.join(__dirname, 'login.html'));
});

// Endpoint Login
app.post('/api/login', (req, res) => {
  const { password } = req.body;
  if (password === process.env.ADMIN_PASSWORD) {
    req.session.autenticado = true;
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, message: 'Contraseña incorrecta' });
  }
});

// Endpoint Logout
app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// Endpoint para obtener los datos (solo admin)
app.get('/api/solicitudes', requireAuth, (req, res) => {
  db.all(`SELECT * FROM solicitudes ORDER BY id DESC`, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ data: rows });
  });
});

// Ruta para recibir nuevas solicitudes
app.post('/api/solicitud', async (req, res) => {
  try {
    const data = req.body;
    const tipoCompleto = data.tipo + (data.otroTipo ? ` (${data.otroTipo})` : '');
    const horaCompleta = `${data.horaInicio} a ${data.horaFin}`;
    const totalCompleto = `${data.total} ${data.modalidad}`;

    // 1. Guardar en Base de Datos
    const stmt = db.prepare(`INSERT INTO solicitudes (fecha, nombre, telefono, puesto, tipo, desde, hasta, hora, total, motivo, justificacion, reemplazo, contactoEmergencia) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    stmt.run([data.fecha, data.nombre, data.telefono, data.puesto, tipoCompleto, data.desde, data.hasta, horaCompleta, totalCompleto, data.motivo, data.justificacion, data.reemplazo, data.contactoEmergencia]);
    stmt.finalize();

    // 2. Lógica de Correos Múltiples
    const correosCompletos = process.env.CORREOS_DESTINO ? process.env.CORREOS_DESTINO.split(',') : [];
    const correoTecnologia = process.env.CORREO_TECNOLOGIA;
    const correoOrigen = process.env.CORREO_ORIGEN || 'onboarding@resend.dev';

    // Correo Detallado para RRHH y otros departamentos
    const asuntoCompleto = `Nueva Solicitud de Permiso - ${data.nombre}`;
    const cuerpoCompleto = `
      <h2>Nueva Solicitud de Permiso: ${data.nombre}</h2>
      <p><strong>Fecha de solicitud:</strong> ${data.fecha}</p>
      <p><strong>Teléfono:</strong> ${data.telefono}</p>
      <p><strong>Puesto:</strong> ${data.puesto}</p>
      <p><strong>Tipo de permiso:</strong> ${tipoCompleto}</p>
      <p><strong>Fechas:</strong> del ${data.desde} al ${data.hasta}</p>
      <p><strong>Hora:</strong> ${horaCompleta}</p>
      <p><strong>Total solicitado:</strong> ${totalCompleto}</p>
      <br>
      <p><strong>Motivo:</strong> ${data.motivo}</p>
      <p><strong>Justificación:</strong> ${data.justificacion}</p>
      <p><strong>Reemplazo:</strong> ${data.reemplazo}</p>
      <p><strong>Contacto Emergencia:</strong> ${data.contactoEmergencia}</p>
    `;

    // Correo Resumido para Tecnología
    const asuntoTecnologia = `Notificación: Solicitud enviada (${data.nombre})`;
    const cuerpoTecnologia = `
      <h3>Aviso del Sistema IVAD</h3>
      <p>Se ha enviado una nueva solicitud de permiso al departamento correspondiente para: <strong>${data.nombre}</strong> (${data.puesto}).</p>
      <p>Este es un mensaje automático para verificar el funcionamiento del sistema.</p>
    `;

    // Envío de correo a los destinatarios principales
    if (correosCompletos.length > 0) {
      await resend.emails.send({
        from: `IVAD Recursos Humanos <${correoOrigen}>`,
        to: correosCompletos,
        subject: asuntoCompleto,
        html: cuerpoCompleto,
      });
    }

    // Envío de correo resumido a Tecnología
    if (correoTecnologia) {
      await resend.emails.send({
        from: `IVAD Sistema <${correoOrigen}>`,
        to: correoTecnologia,
        subject: asuntoTecnologia,
        html: cuerpoTecnologia,
      });
    }

    res.status(200).json({ mensaje: 'Solicitud guardada y enviada correctamente' });
  } catch (error) {
    console.error("Error del servidor:", error);
    res.status(500).json({ error: 'Hubo un error en el servidor.' });
  }
});

app.listen(port, () => {
  console.log(`Servidor de Recursos Humanos corriendo en http://localhost:${port}`);
});
