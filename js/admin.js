pintarHeader();

const usuario = getUsuario();
if (!usuario) {
  window.location.href = 'login.html';
} else if (!usuario.esAdmin) {
  document.querySelector('main').innerHTML =
    '<div class="vacio">Esta sección es solo para administradores.</div>';
}

function mostrarMensaje(texto, tipo = 'error') {
  document.getElementById('zona-mensaje').innerHTML = `<div class="mensaje ${tipo}">${texto}</div>`;
}

const ESTADOS = ['Activo', 'Reservado', 'Contactado', 'Vendido', 'Cancelado'];
let categorias = [];

function opcionesCategorias(seleccionada) {
  return categorias.map((c) => `<option value="${c.Id}" ${Number(c.Id) === Number(seleccionada) ? 'selected' : ''}>${c.Nombre}</option>`).join('');
}

function urlsImagenes(texto) {
  return texto.split('\n').map((url) => url.trim()).filter(Boolean);
}

/* ============================================================
   PESTAÑAS
   ============================================================ */
const tabReservas = document.getElementById('tab-reservas');
const tabProductos = document.getElementById('tab-productos');
const panelReservas = document.getElementById('panel-reservas');
const panelProductos = document.getElementById('panel-productos');

if (tabReservas && tabProductos) {
  tabReservas.addEventListener('click', () => cambiarTab('reservas'));
  tabProductos.addEventListener('click', () => cambiarTab('productos'));
}

function cambiarTab(tab) {
  const esReservas = tab === 'reservas';
  tabReservas.classList.toggle('activa', esReservas);
  tabProductos.classList.toggle('activa', !esReservas);
  panelReservas.style.display = esReservas ? 'block' : 'none';
  panelProductos.style.display = esReservas ? 'none' : 'block';
  if (!esReservas) cargarProductosAdmin();
}

/* ============================================================
   RESERVAS (ya existente)
   ============================================================ */
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
        select.addEventListener('change', (e) => cambiarEstadoCarrito(c.CarritoId, e.target.value));
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

async function cambiarEstadoCarrito(carritoId, estado) {
  try {
    await api(`/admin/carritos/${carritoId}/estado`, { method: 'PUT', body: { estado } });
    cargarCarritos();
  } catch (err) {
    mostrarMensaje(err.message);
  }
}

/* ============================================================
   PRODUCTOS (nuevo)
   ============================================================ */
async function cargarProductosAdmin() {
  if (!usuario || !usuario.esAdmin) return;
  const zona = document.getElementById('lista-productos-admin');

  try {
    const [productos, categoriasApi] = await Promise.all([api('/admin/productos'), api('/productos/categorias')]);
    categorias = categoriasApi;
    const selectorNuevo = document.getElementById('np-categoria');
    if (selectorNuevo) selectorNuevo.innerHTML = opcionesCategorias(categorias[0]?.Id);

    if (productos.length === 0) {
      zona.innerHTML = '<div class="vacio">Todavía no cargaste ningún diseño.</div>';
      return;
    }

    zona.innerHTML = `<div class="grilla-productos-admin">${productos.map(renderTarjetaAdmin).join('')}</div>`;

    productos.forEach((p) => {
      document.getElementById(`guardar-info-${p.Id}`).addEventListener('click', () => guardarInfoProducto(p.Id));
      document.getElementById(`toggle-activo-${p.Id}`).addEventListener('click', () => toggleActivo(p.Id, p.Activo));

      p.talles.forEach((t) => {
        document.getElementById(`guardar-stock-${t.Id}`).addEventListener('click', () => guardarStock(t.Id, p.Id));
        document.getElementById(`eliminar-talle-${t.Id}`).addEventListener('click', () => eliminarTalle(t.Id, p.Id));
      });

      document.getElementById(`agregar-talle-${p.Id}`).addEventListener('click', () => agregarTalle(p.Id));
    });
  } catch (err) {
    mostrarMensaje('No se pudieron cargar los productos: ' + err.message);
  }
}

function renderTarjetaAdmin(p) {
  const talles = p.talles.map((t) => `
    <div class="fila-talle-admin">
      <div class="talle-nombre">${t.Talle}</div>
      <input type="number" min="0" value="${t.Stock}" id="stock-${t.Id}">
      <div style="display:flex; gap:6px;">
        <button class="btn btn-chico" id="guardar-stock-${t.Id}" title="Guardar stock">✓</button>
        <button class="btn btn-outline btn-chico" id="eliminar-talle-${t.Id}" title="Eliminar talle">✕</button>
      </div>
    </div>
  `).join('');

  return `
    <div class="tarjeta-admin-producto ${p.Activo ? '' : 'oculto'}">
      <div>
        <label>Nombre</label>
        <input type="text" id="nombre-${p.Id}" value="${p.Nombre.replace(/"/g, '&quot;')}">
      </div>
      <div>
        <label>Descripción</label>
        <input type="text" id="descripcion-${p.Id}" value="${(p.Descripcion || '').replace(/"/g, '&quot;')}">
      </div>
      <div style="display:flex; gap:10px;">
        <div style="flex:1;">
          <label>Precio ($)</label>
          <input type="number" min="0" id="precio-${p.Id}" value="${p.Precio}">
        </div>
        <div style="flex:2;">
          <label>Categoría</label>
          <select id="categoria-${p.Id}">${opcionesCategorias(p.CategoriaId)}</select>
        </div>
      </div>
      <div>
        <label>URLs de imágenes (una por línea)</label>
        <textarea id="imagenes-${p.Id}" placeholder="https://...">${(p.imagenes || []).map((i) => i.Url).join('\n')}</textarea>
      </div>

      <div>
        <label>Talles y stock</label>
        ${talles || '<p style="color:#8a8471; font-size:13px;">Sin talles cargados.</p>'}
        <div class="fila-nueva-talle" style="margin-top:8px;">
          <input type="text" placeholder="Talle" id="nuevo-talle-nombre-${p.Id}" maxlength="6">
          <input type="number" placeholder="Stock" min="0" id="nuevo-talle-stock-${p.Id}">
          <button class="btn btn-outline btn-chico" id="agregar-talle-${p.Id}">+ Agregar</button>
        </div>
      </div>

      <div class="acciones-producto-admin">
        <button class="btn btn-chico" id="guardar-info-${p.Id}">Guardar cambios</button>
        <button class="btn btn-outline btn-chico" id="toggle-activo-${p.Id}">
          ${p.Activo ? 'Ocultar del catálogo' : 'Mostrar en catálogo'}
        </button>
      </div>
    </div>
  `;
}

async function guardarInfoProducto(id) {
  const nombre = document.getElementById(`nombre-${id}`).value.trim();
  const descripcion = document.getElementById(`descripcion-${id}`).value.trim();
  const precio = parseFloat(document.getElementById(`precio-${id}`).value);
  const imagenes = urlsImagenes(document.getElementById(`imagenes-${id}`).value);
  const categoriaId = Number(document.getElementById(`categoria-${id}`).value);

  if (!nombre || isNaN(precio)) {
    mostrarMensaje('Revisá el nombre y el precio del producto.');
    return;
  }

  try {
    await api(`/productos/${id}`, { method: 'PUT', body: { nombre, descripcion, precio, categoriaId, imagenes } });
    mostrarMensaje('Producto actualizado.', 'ok');
    cargarProductosAdmin();
  } catch (err) {
    mostrarMensaje(err.message);
  }
}

async function toggleActivo(id, activoActual) {
  try {
    await api(`/productos/${id}/estado`, { method: 'PUT', body: { activo: !activoActual } });
    cargarProductosAdmin();
  } catch (err) {
    mostrarMensaje(err.message);
  }
}

async function guardarStock(talleId) {
  const valor = parseInt(document.getElementById(`stock-${talleId}`).value, 10);
  if (isNaN(valor) || valor < 0) {
    mostrarMensaje('El stock tiene que ser un número mayor o igual a 0.');
    return;
  }
  try {
    await api(`/productos/talle/${talleId}`, { method: 'PUT', body: { stock: valor } });
    mostrarMensaje('Stock actualizado.', 'ok');
  } catch (err) {
    mostrarMensaje(err.message);
  }
}

async function eliminarTalle(talleId, productoId) {
  if (!confirm('¿Eliminar este talle del producto?')) return;
  try {
    await api(`/productos/talle/${talleId}`, { method: 'DELETE' });
    cargarProductosAdmin();
  } catch (err) {
    mostrarMensaje(err.message);
  }
}

async function agregarTalle(productoId) {
  const talle = document.getElementById(`nuevo-talle-nombre-${productoId}`).value.trim();
  const stock = parseInt(document.getElementById(`nuevo-talle-stock-${productoId}`).value, 10) || 0;

  if (!talle) {
    mostrarMensaje('Escribí el nombre del talle (ej: S, M, L, XL).');
    return;
  }
  try {
    await api(`/productos/${productoId}/talles`, { method: 'POST', body: { talle, stock } });
    cargarProductosAdmin();
  } catch (err) {
    mostrarMensaje(err.message);
  }
}

/* ============================================================
   FORMULARIO DE PRODUCTO NUEVO
   ============================================================ */
let tallesNuevoProducto = [{ talle: '', stock: 0 }];

const btnMostrarForm = document.getElementById('btn-mostrar-form-nuevo');
const formNuevoProducto = document.getElementById('form-nuevo-producto');

if (btnMostrarForm) {
  btnMostrarForm.addEventListener('click', () => {
    formNuevoProducto.style.display = formNuevoProducto.style.display === 'none' ? 'block' : 'none';
    renderTallesNuevoProducto();
  });

  document.getElementById('np-cancelar').addEventListener('click', () => {
    formNuevoProducto.style.display = 'none';
    limpiarFormNuevoProducto();
  });

  document.getElementById('np-agregar-talle').addEventListener('click', () => {
    tallesNuevoProducto.push({ talle: '', stock: 0 });
    renderTallesNuevoProducto();
  });

  document.getElementById('np-crear').addEventListener('click', crearProductoNuevo);

  renderTallesNuevoProducto();
}

function renderTallesNuevoProducto() {
  const contenedor = document.getElementById('np-talles');
  contenedor.innerHTML = tallesNuevoProducto.map((t, i) => `
    <div class="fila-nueva-talle" style="margin-bottom:6px;">
      <input type="text" placeholder="Talle" maxlength="6" value="${t.talle}" data-indice="${i}" data-campo="talle" class="np-talle-input">
      <input type="number" placeholder="Stock" min="0" value="${t.stock}" data-indice="${i}" data-campo="stock" class="np-talle-input">
      <button type="button" class="btn btn-outline btn-chico np-quitar-talle" data-indice="${i}">✕</button>
    </div>
  `).join('');

  contenedor.querySelectorAll('.np-talle-input').forEach((input) => {
    input.addEventListener('input', (e) => {
      const i = parseInt(e.target.dataset.indice, 10);
      const campo = e.target.dataset.campo;
      tallesNuevoProducto[i][campo] = campo === 'stock' ? parseInt(e.target.value, 10) || 0 : e.target.value;
    });
  });

  contenedor.querySelectorAll('.np-quitar-talle').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const i = parseInt(e.target.dataset.indice, 10);
      tallesNuevoProducto.splice(i, 1);
      if (tallesNuevoProducto.length === 0) tallesNuevoProducto.push({ talle: '', stock: 0 });
      renderTallesNuevoProducto();
    });
  });
}

function limpiarFormNuevoProducto() {
  document.getElementById('np-nombre').value = '';
  document.getElementById('np-descripcion').value = '';
  document.getElementById('np-precio').value = '';
  document.getElementById('np-imagenes').value = '';
  tallesNuevoProducto = [{ talle: '', stock: 0 }];
  renderTallesNuevoProducto();
}

async function crearProductoNuevo() {
  const nombre = document.getElementById('np-nombre').value.trim();
  const descripcion = document.getElementById('np-descripcion').value.trim();
  const precio = parseFloat(document.getElementById('np-precio').value);
  const imagenes = urlsImagenes(document.getElementById('np-imagenes').value);
  const categoriaId = Number(document.getElementById('np-categoria').value);
  const talles = tallesNuevoProducto.filter((t) => t.talle.trim() !== '');

  if (!nombre || isNaN(precio) || talles.length === 0) {
    mostrarMensaje('Completá nombre, precio y al menos un talle con su stock.');
    return;
  }

  try {
    await api('/productos', { method: 'POST', body: { nombre, descripcion, precio, categoriaId, imagenes, talles } });
    mostrarMensaje('Producto creado correctamente.', 'ok');
    formNuevoProducto.style.display = 'none';
    limpiarFormNuevoProducto();
    cargarProductosAdmin();
  } catch (err) {
    mostrarMensaje(err.message);
  }
}

cargarCarritos();
