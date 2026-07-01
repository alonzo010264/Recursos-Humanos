const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { Resend } = require('resend');
const session = require('express-session');
const path = require('path');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Inicializamos Resend (Fallback directo por si fallan las variables de Vercel)
const resend = new Resend(process.env.RESEND_API_KEY || 're_ivMDQoyH_3PNTzFKrzAbFuDBSdeBAyzWy');

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

// Intentar cargar SQLite de forma segura para evitar crasheos en Vercel
let db = null;
try {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = process.env.VERCEL || process.env.NODE_ENV === 'production' 
    ? '/tmp/database.sqlite' 
    : './database.sqlite';

  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error("Error al conectar con la base de datos", err.message);
    } else {
      console.log("Conectado a la base de datos SQLite en: " + dbPath);
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
        descontarVacaciones TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, () => {
        // Intentar agregar la columna por si la tabla ya existía de antes en local
        db.run("ALTER TABLE solicitudes ADD COLUMN descontarVacaciones TEXT", () => {});
      });
    }
  });
} catch (sqliteError) {
  console.log("SQLite no soportado en este entorno. Se usará base de datos en memoria.");
}

// Fallback temporal en memoria (útil para Vercel)
const memoryDB = [];

// Middleware de Autenticación
function requireAuth(req, res, next) {
  if (req.session.autenticado) {
    next();
  } else {
    res.redirect('/login');
  }
}

// Rutas estáticas para la web pública (excepto admin)
app.use(express.static('./', { index: false }));

// Ruta principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Rutas protegidas para el panel de administración
app.get('/admin', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});
app.get('/admin.css', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.css'));
});
app.get('/admin.js', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.js'));
});

app.get('/login', (req, res) => {
  if (req.session.autenticado) return res.redirect('/admin');
  res.sendFile(path.join(__dirname, 'login.html'));
});

// Endpoint Login
app.post('/api/login', (req, res) => {
  const { password } = req.body;
  const crypto = require('crypto');
  const inputHash = crypto.createHash('sha256').update(password || '').digest('hex');
  // Hash seguro de la contraseña por defecto para no exponerla en código abierto
  const fallbackHash = '6276637acb97c8618ebee4001af222c29bf2771c6ef36d7b6ccabec9c7f096f0';

  if (password === process.env.ADMIN_PASSWORD || inputHash === fallbackHash) {
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
  if (!db) {
    return res.json({ data: memoryDB.slice().reverse() });
  }
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

    // 1. Guardar en Base de Datos (Seguro para Vercel)
    try {
      if (db) {
        const stmt = db.prepare(`INSERT INTO solicitudes (fecha, nombre, telefono, puesto, tipo, desde, hasta, hora, total, motivo, justificacion, reemplazo, contactoEmergencia, descontarVacaciones) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
        stmt.run([data.fecha, data.nombre, data.telefono, data.puesto, tipoCompleto, data.desde, data.hasta, horaCompleta, totalCompleto, data.motivo, data.justificacion, data.reemplazo, data.contactoEmergencia, data.descontarVacaciones]);
        stmt.finalize();
      } else {
        // Guardar en memoria para Vercel si falló SQLite
        memoryDB.push({
          id: memoryDB.length + 1,
          fecha: data.fecha,
          nombre: data.nombre,
          telefono: data.telefono,
          puesto: data.puesto,
          tipo: tipoCompleto,
          desde: data.desde,
          hasta: data.hasta,
          hora: horaCompleta,
          total: totalCompleto,
          motivo: data.motivo,
          justificacion: data.justificacion,
          reemplazo: data.reemplazo,
          contactoEmergencia: data.contactoEmergencia,
          descontarVacaciones: data.descontarVacaciones,
          timestamp: new Date().toISOString()
        });
      }
    } catch (dbErr) {
      console.error("Error de base de datos en Vercel:", dbErr);
    }

    // 2. Lógica de Correos Múltiples (Fallbacks añadidos para Vercel)
    const correosPorDefecto = [
      'logistica@ivadsrl.com',
      'tecnologia@ivadsrl.com',
      'myriamlaval@ivadsrl.com',
      'contabilidad@ivadsrl.com',
      'joseramonmiranda@ivadsrl.com'
    ];
    const correosCompletos = process.env.CORREOS_DESTINO ? process.env.CORREOS_DESTINO.split(',') : correosPorDefecto;
    const correoTecnologia = process.env.CORREO_TECNOLOGIA || null;
    const correoOrigen = process.env.CORREO_ORIGEN || 'recursoshumanos@ivadsrl.com';

    const logoUrl = "https://raw.githubusercontent.com/alonzo010264/Recursos-Humanos/main/Logo.png";
    const estiloGlobal = `
      <style>
        body { font-family: Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; color: #333; }
        .container { background-color: #ffffff; padding: 30px; border-radius: 8px; max-width: 600px; margin: auto; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
        .header { text-align: center; border-bottom: 2px solid #eaeaea; padding-bottom: 20px; margin-bottom: 20px; }
        .header img { max-width: 120px; }
        .title { font-size: 20px; color: #1a1a1a; font-weight: bold; margin-top: 15px; text-transform: uppercase; letter-spacing: 1px; }
        .content p { margin: 8px 0; font-size: 15px; line-height: 1.5; }
        .content strong { color: #555; }
        .footer { margin-top: 30px; border-top: 1px solid #eaeaea; padding-top: 15px; text-align: center; font-size: 12px; color: #888; }
      </style>
    `;

    // Correo Detallado para RRHH y otros departamentos
    const asuntoCompleto = `Nueva Solicitud de Permiso - ${data.nombre}`;
    const cuerpoCompleto = `
      ${estiloGlobal}
      <div class="container">
        <div class="header">
          <img src="${logoUrl}" alt="IVAD Home & Goods" />
          <div class="title">SOLICITUD DE PERMISO</div>
        </div>
        <div class="content">
          <p><strong>Colaborador:</strong> ${data.nombre}</p>
          <p><strong>Puesto:</strong> ${data.puesto}</p>
          <p><strong>Teléfono:</strong> ${data.telefono}</p>
          <hr style="border: 0; border-top: 1px solid #eaeaea; margin: 15px 0;">
          <p><strong>Tipo de permiso:</strong> <span style="background: #e3f2fd; color: #1976d2; padding: 3px 8px; border-radius: 4px;">${tipoCompleto}</span></p>
          <p><strong>¿Descontar de vacaciones?:</strong> <strong style="color: ${data.descontarVacaciones === 'Si' ? '#d32f2f' : '#388e3c'};">${data.descontarVacaciones === 'Si' ? 'Sí' : 'No'}</strong></p>
          <p><strong>Fechas:</strong> del ${data.desde} al ${data.hasta}</p>
          <p><strong>Horario:</strong> ${horaCompleta}</p>
          <p><strong>Total solicitado:</strong> ${totalCompleto}</p>
          <hr style="border: 0; border-top: 1px solid #eaeaea; margin: 15px 0;">
          <p><strong>Motivo principal:</strong></p>
          <p style="background: #f9f9f9; padding: 10px; border-left: 3px solid #ccc;">${data.motivo}</p>
          <p><strong>Justificación adicional:</strong> ${data.justificacion || 'N/A'}</p>
          <p><strong>Reemplazo sugerido:</strong> ${data.reemplazo || 'N/A'}</p>
          <p><strong>Contacto de Emergencia:</strong> ${data.contactoEmergencia || 'N/A'}</p>
        </div>
        <div class="footer">
          IVAD Home & Goods · Departamento de Recursos Humanos
        </div>
      </div>
    `;

    // Correo Resumido para Tecnología (Ahora se manda también el completo pero con otra cabecera o simplemente igual)
    const asuntoTecnologia = `Notificación IVAD: Solicitud enviada (${data.nombre})`;
    const cuerpoTecnologia = cuerpoCompleto; // El usuario pidió enviar la solicitud completa con el logo


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

// Exportar la app para Vercel
module.exports = app;
