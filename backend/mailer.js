const nodemailer = require('nodemailer');

function smtpConfigurado() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function transporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: process.env.SMTP_SECURE !== 'false',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

function plantilla({ titulo, contenido }) {
  return `<!doctype html><html><body style="margin:0;background:#101010;color:#f3f1ed;font-family:Arial,sans-serif"><main style="max-width:580px;margin:0 auto;padding:36px 28px"><p style="margin:0 0 25px;color:#d8ff33;font-size:11px;letter-spacing:2px">NASTYCREW / BUENOS AIRES</p><h1 style="margin:0 0 22px;font-size:32px;line-height:1;color:#f3f1ed">${titulo}</h1><div style="color:#cfcbc5;font-size:15px;line-height:1.65">${contenido}</div><hr style="border:0;border-top:1px solid #3c3c3c;margin:32px 0 18px"><p style="margin:0;color:#8f8b84;font-size:11px;letter-spacing:1px">NASTYCREW — HECHO PARA LA CALLE</p></main></body></html>`;
}

async function enviarMail({ to, subject, titulo, contenido }) {
  if (!smtpConfigurado()) {
    console.warn('SMTP no configurado: se omitió el correo.', { subject });
    return;
  }
  await transporter().sendMail({
    from: process.env.SMTP_FROM || `"NASTYCREW" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html: plantilla({ titulo, contenido }),
  });
}

async function enviarBienvenida(usuario) {
  return enviarMail({
    to: usuario.Email,
    subject: 'Bienvenido a NASTYCREW',
    titulo: `Bienvenido, ${usuario.Nombre}.`,
    contenido: '<p>Tu cuenta ya está lista. Ahora podés reservar las piezas del drop que más te representen.</p><p style="color:#d8ff33">NO RULES. JUST CREW.</p>',
  });
}

async function enviarAvisoReserva({ cliente, carritoId, items, total }) {
  const lineas = items.map((item) => `<li style="margin:8px 0"><strong>${item.Cantidad}× ${item.ProductoNombre}</strong> — talle ${item.Talle} — $${Number(item.PrecioUnitario * item.Cantidad).toLocaleString('es-AR')}</li>`).join('');
  return enviarMail({
    to: process.env.STORE_NOTIFICATION_EMAIL || process.env.SMTP_USER,
    subject: `Nueva reserva #${carritoId} — ${cliente.nombre}`,
    titulo: 'Nueva reserva confirmada',
    contenido: `<p><strong>Cliente:</strong> ${cliente.nombre}<br><strong>Email:</strong> ${cliente.email}<br><strong>Teléfono:</strong> ${cliente.telefono || 'Sin teléfono'}</p><p><strong>Productos:</strong></p><ul style="padding-left:20px">${lineas}</ul><p style="font-size:18px;color:#d8ff33"><strong>Total: $${Number(total).toLocaleString('es-AR')}</strong></p>`,
  });
}

module.exports = { enviarBienvenida, enviarAvisoReserva };
