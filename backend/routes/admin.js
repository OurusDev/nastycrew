const express = require('express');
const { pool } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/admin/carritos -> todos los carritos con datos del usuario y sus ítems
// Sirve para que vos veas quién reservó qué, y sus datos de contacto (email/teléfono).
router.get('/carritos', requireAuth, requireAdmin, async (req, res) => {
  try {
    const carritos = await pool.query(`
      SELECT
        c.id AS "CarritoId", c.estado AS "Estado",
        c.fecha_creacion AS "FechaCreacion", c.fecha_actualizacion AS "FechaActualizacion",
        u.id AS "UsuarioId", u.nombre AS "UsuarioNombre", u.email AS "Email", u.telefono AS "Telefono"
      FROM carritos c
      JOIN usuarios u ON u.id = c.usuario_id
      ORDER BY c.fecha_actualizacion DESC
    `);

    const items = await pool.query(`
      SELECT
        ci.carrito_id AS "CarritoId", ci.id AS "ItemId", ci.cantidad AS "Cantidad",
        ci.precio_unitario AS "PrecioUnitario",
        p.nombre AS "ProductoNombre", t.talle AS "Talle"
      FROM carrito_items ci
      JOIN productos p ON p.id = ci.producto_id
      JOIN talles t ON t.id = ci.talle_id
    `);

    const carritosConItems = carritos.rows.map((c) => {
      const suyos = items.rows.filter((i) => i.CarritoId === c.CarritoId);
      const total = suyos.reduce((acc, it) => acc + it.Cantidad * Number(it.PrecioUnitario), 0);
      return { ...c, items: suyos, total };
    });

    res.json(carritosConItems);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor al obtener los carritos.' });
  }
});

// PUT /api/admin/carritos/:id/estado -> marcar como Contactado / Vendido / Cancelado
router.put('/carritos/:id/estado', requireAuth, requireAdmin, async (req, res) => {
  const { estado } = req.body;
  const validos = ['Activo', 'Reservado', 'Contactado', 'Vendido', 'Cancelado'];
  if (!validos.includes(estado)) {
    return res.status(400).json({ error: 'Estado inválido.' });
  }
  try {
    await pool.query(
      `UPDATE carritos SET estado = $1, fecha_actualizacion = NOW() WHERE id = $2`,
      [estado, req.params.id]
    );
    res.json({ mensaje: 'Estado actualizado.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor al actualizar el estado.' });
  }
});

// GET /api/admin/usuarios -> listado simple de usuarios registrados
router.get('/usuarios', requireAuth, requireAdmin, async (req, res) => {
  try {
    const usuarios = await pool.query(`
      SELECT id AS "Id", nombre AS "Nombre", email AS "Email",
             telefono AS "Telefono", fecha_creacion AS "FechaCreacion"
      FROM usuarios ORDER BY fecha_creacion DESC
    `);
    res.json(usuarios.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor al obtener los usuarios.' });
  }
});

module.exports = router;
