const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const { enviarBienvenida } = require('../mailer');

const router = express.Router();

function crearToken(usuario) {
  return jwt.sign(
    { id: usuario.Id, email: usuario.Email, esAdmin: !!usuario.EsAdmin },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// POST /api/auth/registro
router.post('/registro', async (req, res) => {
  try {
    const { nombre, email, telefono, password } = req.body;
    if (!nombre || !email || !password) {
      return res.status(400).json({ error: 'Nombre, email y contraseña son obligatorios.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
    }

    const existente = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email]);
    if (existente.rows.length > 0) {
      return res.status(409).json({ error: 'Ya existe una cuenta con ese email.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const resultado = await pool.query(
      `INSERT INTO usuarios (nombre, email, telefono, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id AS "Id", nombre AS "Nombre", email AS "Email", es_admin AS "EsAdmin"`,
      [nombre, email, telefono || null, passwordHash]
    );

    const usuario = resultado.rows[0];
    const token = crearToken(usuario);

    // El registro no debe fallar si el proveedor de correo está temporalmente caído.
    enviarBienvenida(usuario).catch((mailError) => console.error('No se pudo enviar el mail de bienvenida:', mailError));

    res.status(201).json({
      token,
      usuario: { id: usuario.Id, nombre: usuario.Nombre, email: usuario.Email, esAdmin: !!usuario.EsAdmin },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor al registrar el usuario.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son obligatorios.' });
    }

    const resultado = await pool.query(
      `SELECT id AS "Id", nombre AS "Nombre", email AS "Email",
              password_hash AS "PasswordHash", es_admin AS "EsAdmin"
       FROM usuarios WHERE email = $1`,
      [email]
    );

    const usuario = resultado.rows[0];
    if (!usuario) {
      return res.status(401).json({ error: 'Email o contraseña incorrectos.' });
    }

    const passwordOk = await bcrypt.compare(password, usuario.PasswordHash);
    if (!passwordOk) {
      return res.status(401).json({ error: 'Email o contraseña incorrectos.' });
    }

    const token = crearToken(usuario);
    res.json({
      token,
      usuario: { id: usuario.Id, nombre: usuario.Nombre, email: usuario.Email, esAdmin: !!usuario.EsAdmin },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor al iniciar sesión.' });
  }
});

module.exports = router;
