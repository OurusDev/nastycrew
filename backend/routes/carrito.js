const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Busca el carrito "Activo" del usuario, o crea uno si no existe.
async function obtenerOCrearCarritoActivo(usuarioId) {
  const existente = await pool.query(
    `SELECT id FROM carritos WHERE usuario_id = $1 AND estado = 'Activo'`,
    [usuarioId]
  );
  if (existente.rows.length > 0) {
    return existente.rows[0].id;
  }

  const creado = await pool.query(
    `INSERT INTO carritos (usuario_id, estado) VALUES ($1, 'Activo') RETURNING id`,
    [usuarioId]
  );
  return creado.rows[0].id;
}

async function obtenerCarritoConItems(carritoId) {
  const items = await pool.query(
    `SELECT
        ci.id AS "ItemId", ci.cantidad AS "Cantidad", ci.precio_unitario AS "PrecioUnitario",
        p.id AS "ProductoId", p.nombre AS "ProductoNombre", p.imagen_url AS "ImagenUrl",
        t.id AS "TalleId", t.talle AS "Talle", t.stock AS "StockDisponible"
      FROM carrito_items ci
      JOIN productos p ON p.id = ci.producto_id
      JOIN talles t ON t.id = ci.talle_id
      WHERE ci.carrito_id = $1
      ORDER BY ci.fecha_agregado ASC`,
    [carritoId]
  );
  return items.rows;
}

// GET /api/carrito -> ver el carrito activo del usuario logueado
router.get('/', requireAuth, async (req, res) => {
  try {
    const carritoId = await obtenerOCrearCarritoActivo(req.user.id);
    const items = await obtenerCarritoConItems(carritoId);
    const total = items.reduce((acc, it) => acc + it.Cantidad * Number(it.PrecioUnitario), 0);
    res.json({ carritoId, items, total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor al obtener el carrito.' });
  }
});

// POST /api/carrito/items -> agregar una prenda (producto + talle) al carrito
// body: { productoId, talleId, cantidad }
router.post('/items', requireAuth, async (req, res) => {
  const { productoId, talleId, cantidad } = req.body;
  const cant = parseInt(cantidad, 10) || 1;

  if (!productoId || !talleId) {
    return res.status(400).json({ error: 'Faltan productoId y talleId.' });
  }

  try {
    const talleInfo = await pool.query(
      `SELECT stock AS "Stock" FROM talles WHERE id = $1 AND producto_id = $2`,
      [talleId, productoId]
    );

    if (talleInfo.rows.length === 0) {
      return res.status(404).json({ error: 'El talle no corresponde a ese producto.' });
    }
    if (talleInfo.rows[0].Stock < cant) {
      return res.status(409).json({ error: 'No hay stock suficiente para ese talle.' });
    }

    const producto = await pool.query(
      `SELECT precio AS "Precio" FROM productos WHERE id = $1 AND activo = true`,
      [productoId]
    );

    if (producto.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado.' });
    }

    const carritoId = await obtenerOCrearCarritoActivo(req.user.id);

    // Si ya existe ese mismo producto+talle en el carrito, suma la cantidad.
    const itemExistente = await pool.query(
      `SELECT id AS "Id", cantidad AS "Cantidad" FROM carrito_items
       WHERE carrito_id = $1 AND producto_id = $2 AND talle_id = $3`,
      [carritoId, productoId, talleId]
    );

    if (itemExistente.rows.length > 0) {
      const item = itemExistente.rows[0];
      await pool.query(`UPDATE carrito_items SET cantidad = $1 WHERE id = $2`, [
        item.Cantidad + cant,
        item.Id,
      ]);
    } else {
      await pool.query(
        `INSERT INTO carrito_items (carrito_id, producto_id, talle_id, cantidad, precio_unitario)
         VALUES ($1, $2, $3, $4, $5)`,
        [carritoId, productoId, talleId, cant, producto.rows[0].Precio]
      );
    }

    await pool.query(`UPDATE carritos SET fecha_actualizacion = NOW() WHERE id = $1`, [carritoId]);

    const items = await obtenerCarritoConItems(carritoId);
    res.status(201).json({ carritoId, items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor al agregar el ítem.' });
  }
});

// PUT /api/carrito/items/:itemId -> cambiar cantidad de un ítem
router.put('/items/:itemId', requireAuth, async (req, res) => {
  const { cantidad } = req.body;
  if (!cantidad || cantidad < 1) {
    return res.status(400).json({ error: 'La cantidad debe ser al menos 1.' });
  }
  try {
    await pool.query(`UPDATE carrito_items SET cantidad = $1 WHERE id = $2`, [cantidad, req.params.itemId]);
    res.json({ mensaje: 'Cantidad actualizada.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor al actualizar la cantidad.' });
  }
});

// DELETE /api/carrito/items/:itemId -> quitar un ítem del carrito
router.delete('/items/:itemId', requireAuth, async (req, res) => {
  try {
    await pool.query(`DELETE FROM carrito_items WHERE id = $1`, [req.params.itemId]);
    res.json({ mensaje: 'Ítem eliminado del carrito.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor al eliminar el ítem.' });
  }
});

// POST /api/carrito/confirmar -> el usuario confirma su reserva
// (queda "Reservado" para que vos lo veas en el panel admin y lo contactes)
router.post('/confirmar', requireAuth, async (req, res) => {
  try {
    const carritoId = await obtenerOCrearCarritoActivo(req.user.id);
    const items = await obtenerCarritoConItems(carritoId);

    if (items.length === 0) {
      return res.status(400).json({ error: 'El carrito está vacío.' });
    }

    await pool.query(
      `UPDATE carritos SET estado = 'Reservado', fecha_actualizacion = NOW() WHERE id = $1`,
      [carritoId]
    );

    res.json({ mensaje: 'Reserva confirmada. En breve te contactamos para coordinar el pago y la entrega.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor al confirmar la reserva.' });
  }
});

module.exports = router;
