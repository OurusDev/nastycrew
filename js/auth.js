pintarHeader();

function mostrarMensaje(texto, tipo = 'error') {
  const zona = document.getElementById('zona-mensaje');
  zona.innerHTML = `<div class="mensaje ${tipo}">${texto}</div>`;
}

const formLogin = document.getElementById('form-login');
if (formLogin) {
  formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    try {
      const datos = await api('/auth/login', { method: 'POST', body: { email, password } });
      guardarSesion(datos.token, datos.usuario);
      window.location.href = datos.usuario.esAdmin ? 'admin.html' : 'index.html';
    } catch (err) {
      mostrarMensaje(err.message);
    }
  });
}

const formRegistro = document.getElementById('form-registro');
if (formRegistro) {
  formRegistro.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombre = document.getElementById('nombre').value.trim();
    const email = document.getElementById('email').value.trim();
    const telefono = document.getElementById('telefono').value.trim();
    const password = document.getElementById('password').value;

    try {
      const datos = await api('/auth/registro', { method: 'POST', body: { nombre, email, telefono, password } });
      guardarSesion(datos.token, datos.usuario);
      window.location.href = 'index.html';
    } catch (err) {
      mostrarMensaje(err.message);
    }
  });
}
