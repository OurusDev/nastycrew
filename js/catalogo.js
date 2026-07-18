pintarHeader();

const seleccionTalle = {}; // { productoId: talleId }

async function cargarCatalogo() {
  const grilla = document.getElementById('grilla');
  const mensajeCarga = document.getElementById('mensaje-carga');

  try {
    const productos = await api('/productos');
    mensajeCarga.style.display = 'none';

    if (productos.length === 0) {
      grilla.innerHTML = '<div class="vacio">Todavía no cargaste ningún diseño. Agregalos desde el panel admin.</div>';
      return;
    }

    grilla.innerHTML = productos.map((p) => renderTarjeta(p)).join('');

    productos.forEach((p) => {
      p.talles.forEach((t) => {
        const boton = document.getElementById(`talle-${p.Id}-${t.Id}`);
        if (!boton || t.Stock <= 0) return;
        boton.addEventListener('click', () => seleccionarTalle(p.Id, t.Id));
      });

      const botonAgregar = document.getElementById(`agregar-${p.Id}`);
      botonAgregar.addEventListener('click', () => agregarAlCarrito(p.Id));
    });
  } catch (err) {
    mensajeCarga.textContent = 'No se pudo conectar con el servidor. ¿Está corriendo el backend?';
  }
}

function renderTarjeta(p) {
  const talles = p.talles.map((t) => `
    <button
      class="talle-btn"
      id="talle-${p.Id}-${t.Id}"
      ${t.Stock <= 0 ? 'disabled title="Sin stock"' : ''}
    >${t.Talle}</button>
  `).join('');

  return `
    <div class="tarjeta-producto">
      <div class="imagen">
        ${p.ImagenUrl ? `<img src="${p.ImagenUrl}" alt="${p.Nombre}">` : 'Sin imagen'}
      </div>
      <div class="info">
        <h3>${p.Nombre}</h3>
        <div class="descripcion">${p.Descripcion || ''}</div>
        <div class="talles">${talles}</div>
        <div class="precio">${formatearPrecio(p.Precio)}</div>
        <button class="btn" id="agregar-${p.Id}">Reservar talle</button>
      </div>
    </div>
  `;
}

function seleccionarTalle(productoId, talleId) {
  seleccionTalle[productoId] = talleId;
  document.querySelectorAll(`[id^="talle-${productoId}-"]`).forEach((btn) => {
    btn.classList.toggle('seleccionado', btn.id === `talle-${productoId}-${talleId}`);
  });
}

async function agregarAlCarrito(productoId) {
  if (!getUsuario()) {
    window.location.href = 'login.html';
    return;
  }
  const talleId = seleccionTalle[productoId];
  if (!talleId) {
    alert('Elegí un talle antes de reservar.');
    return;
  }
  try {
    await api('/carrito/items', { method: 'POST', body: { productoId, talleId, cantidad: 1 } });
    if (confirm('¡Agregado a tu carrito! ¿Querés ir a verlo ahora?')) {
      window.location.href = 'carrito.html';
    }
  } catch (err) {
    alert(err.message);
  }
}

cargarCatalogo();
