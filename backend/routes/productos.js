const express = require('express');
const { pool } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/productos  -> catálogo completo con talles y stock (público)
router.get('/', async (req, res) => {
  try {
    const productos = await pool.query(`
      SELECT id AS "Id", nombre AS "Nombre", descripcion AS "Descripcion",
             precio AS "Precio", imagen_url AS "ImagenUrl"
      FROM productos
      WHERE activo = true
      ORDER BY fecha_creacion DESC
    `);

    const talles = await pool.query(`
      SELECT id AS "Id", producto_id AS "ProductoId", talle AS "Talle", stock AS "Stock"
      FROM talles
    `);

    const productosConTalles = productos.rows.map((p) => ({
      ...p,
      talles: talles.rows.filter((t) => t.ProductoId === p.Id),
    }));

    res.json(productosConTalles);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor al obtener los productos.' });
  }
});

// GET /api/productos/:id -> detalle de un producto
router.get('/:id', async (req, res) => {
  try {
    const producto = await pool.query(
      `SELECT id AS "Id", nombre AS "Nombre", descripcion AS "Descripcion",
              precio AS "Precio", imagen_url AS "ImagenUrl"
       FROM productos WHERE id = $1 AND activo = true`,
      [req.params.id]
    );

    if (producto.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado.' });
    }

    const talles = await pool.query(
      `SELECT id AS "Id", talle AS "Talle", stock AS "Stock" FROM talles WHERE producto_id = $1`,
      [req.params.id]
    );

    res.json({ ...producto.rows[0], talles: talles.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor al obtener el producto.' });
  }
});

// POST /api/productos -> crear un producto nuevo (solo admin)
// body: { nombre, descripcion, precio, imagenUrl, talles: [{ talle: 'S', stock: 5 }, ...] }
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const { nombre, descripcion, precio, imagenUrl, talles } = req.body;
  if (!nombre || precio == null || !Array.isArray(talles) || talles.length === 0) {
    return res.status(400).json({ error: 'Faltan datos: nombre, precio y al menos un talle.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const resultado = await client.query(
      `INSERT INTO productos (nombre, descripcion, precio, imagen_url)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [nombre, descripcion || null, precio, imagenUrl || null]
    );
    const productoId = resultado.rows[0].id;

    for (const t of talles) {
      await client.query(
        `INSERT INTO talles (producto_id, talle, stock) VALUES ($1, $2, $3)`,
        [productoId, t.talle, t.stock || 0]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ id: productoId, mensaje: 'Producto creado correctamente.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Error del servidor al crear el producto.' });
  } finally {
    client.release();
  }
});

// PUT /api/productos/talle/:talleId -> actualizar stock de un talle (solo admin)
router.put('/talle/:talleId', requireAuth, requireAdmin, async (req, res) => {
  const { stock } = req.body;
  if (stock == null) return res.status(400).json({ error: 'Falta el valor de stock.' });

  try {
    await pool.query('UPDATE talles SET stock = $1 WHERE id = $2', [stock, req.params.talleId]);
    res.json({ mensaje: 'Stock actualizado.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor al actualizar el stock.' });
  }
});

module.exports = router;
