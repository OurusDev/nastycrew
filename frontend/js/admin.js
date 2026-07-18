pintarHeader();

const usuario = getUsuario();
if (!usuario) {
  window.location.href = 'login.html';
} else if (!usuario.esAdmin) {
  document.getElementById('zona-admin').innerHTML =
    '<div class="vacio">Esta sección es solo para administradores.</div>';
}

function mostrarMensaje(texto, tipo = 'error') {
  document.getElementById('zona-mensaje').innerHTML = `<div class="mensaje ${tipo}">${texto}</div>`;
}

const ESTADOS = ['Activo', 'Reservado', 'Contactado', 'Vendido', 'Cancelado'];

async function cargarCarritos() {
  if (!usuario || !usuario.esAdmin) return;
  const zona = document.getElementById('zona-admin');

  try {
    const carritos = await api('/admin/carritos');

    if (carritos.length === 0) {
      zona.innerHTML = '<div class="vacio">Todavía no hay carritos de clientes.</div>';
      return;
    }

    zona.innerHTML = `
      <table class="tabla-admin">
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Contacto</th>
            <th>Prendas</th>
            <th>Total</th>
            <th>Estado</th>
            <th>Actualizado</th>
          </tr>
        </thead>
        <tbody>
          ${carritos.map(renderFilaCarrito).join('')}
        </tbody>
      </table>
    `;

    carritos.forEach((c) => {
      const select = document.getElementById(`estado-${c.CarritoId}`);
      if (select) {
        select.addEventListener('change', (e) => cambiarEstado(c.CarritoId, e.target.value));
      }
    });
  } catch (err) {
    mostrarMensaje('No se pudieron cargar los carritos: ' + err.message);
  }
}

function renderFilaCarrito(c) {
  const items = c.items.length
    ? c.items.map((it) => `${it.Cantidad}× ${it.ProductoNombre} (talle ${it.Talle})`).join('<br>')
    : '<em>Sin prendas</em>';

  const telefonoLimpio = (c.Telefono || '').replace(/[^0-9]/g, '');
  const linkWhatsapp = telefonoLimpio
    ? `<br><a class="contacto-link" target="_blank" href="https://wa.me/${telefonoLimpio}">Abrir WhatsApp</a>`
    : '';

  return `
    <tr>
      <td><strong>${c.UsuarioNombre}</strong></td>
      <td>
        <a class="contacto-link" href="mailto:${c.Email}">${c.Email}</a><br>
        ${c.Telefono || '<em>sin teléfono</em>'}
        ${linkWhatsapp}
      </td>
      <td>${items}</td>
      <td>${formatearPrecio(c.total)}</td>
      <td>
        <span class="pill-estado pill-${c.Estado}">${c.Estado}</span><br>
        <select class="selector-estado" id="estado-${c.CarritoId}">
          ${ESTADOS.map((e) => `<option value="${e}" ${e === c.Estado ? 'selected' : ''}>${e}</option>`).join('')}
        </select>
      </td>
      <td>${new Date(c.FechaActualizacion).toLocaleString('es-AR')}</td>
    </tr>
  `;
}

async function cambiarEstado(carritoId, estado) {
  try {
    await api(`/admin/carritos/${carritoId}/estado`, { method: 'PUT', body: { estado } });
    cargarCarritos();
  } catch (err) {
    mostrarMensaje(err.message);
  }
}

cargarCarritos();
