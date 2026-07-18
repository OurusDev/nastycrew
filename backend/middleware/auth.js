const jwt = require('jsonwebtoken');
require('dotenv').config();

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autenticado. Iniciá sesión.' });
  }
  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, email, esAdmin }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Sesión inválida o expirada.' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || !req.user.esAdmin) {
    return res.status(403).json({ error: 'No tenés permisos de administrador.' });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
