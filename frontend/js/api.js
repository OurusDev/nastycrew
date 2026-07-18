// Cambiá esto si tu backend corre en otra URL/puerto.
const API_URL = 'http://localhost:4000/api';

function getToken() {
  return localStorage.getItem('token');
}

function getUsuario() {
  const data = localStorage.getItem('usuario');
  return data ? JSON.parse(data) : null;
}

function guardarSesion(token, usuario) {
  localStorage.setItem('token', token);
  localStorage.setItem('usuario', JSON.stringify(usuario));
}

function cerrarSesion() {
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');
  window.location.href = 'login.html';
}

// Wrapper de fetch que agrega el token si existe y parsea JSON/errores.
async function api(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const respuesta = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const datos = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok) {
    throw new Error(datos.error || 'Ocurrió un error inesperado.');
  }
  return datos;
}

// Actualiza el header según si hay sesión iniciada o no.
function pintarHeader() {
  const usuario = getUsuario();
  const zona = document.getElementById('zona-usuario');
  if (!zona) return;

  if (usuario) {
    zona.innerHTML = `
      <span>Hola, ${usuario.nombre.split(' ')[0]}</span>
      ${usuario.esAdmin ? '<a href="admin.html">Panel admin</a>' : ''}
      <a href="carrito.html">Carrito</a>
      <a href="#" id="btn-cerrar-sesion">Salir</a>
    `;
    document.getElementById('btn-cerrar-sesion').addEventListener('click', (e) => {
      e.preventDefault();
      cerrarSesion();
    });
  } else {
    zona.innerHTML = `
      <a href="login.html">Ingresar</a>
      <a href="registro.html">Crear cuenta</a>
    `;
  }
}

function formatearPrecio(valor) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(valor);
}
