pintarHeader();

if (!getUsuario()) {
  window.location.href = 'login.html';
}

function mostrarMensaje(texto, tipo = 'error') {
  document.getElementById('zona-mensaje').innerHTML = `<div class="mensaje ${tipo}">${texto}</div>`;
}

async function cargarCarrito() {
  const contenedor = document.getElementById('lista-carrito');
  try {
    const { items, total } = await api('/carrito');

    if (items.length === 0) {
      contenedor.innerHTML = `
        <div class="vacio">
          Tu carrito está vacío.<br><br>
          <a class="btn" href="index.html">Ver catálogo</a>
        </div>`;
      return;
    }

    contenedor.innerHTML = `
      ${items.map((it) => renderFila(it)).join('')}
      <div class="resumen-total">
        <span>Total</span>
        <span>${formatearPrecio(total)}</span>
      </div>
      <div style="display:flex; gap:12px; justify-content:flex-end; margin-top:16px;">
        <a class="btn btn-outline" href="index.html">Seguir eligiendo</a>
        <button class="btn" id="btn-confirmar">Confirmar reserva</button>
      </div>
    `;

    items.forEach((it) => {
      document.getElementById(`quitar-${it.ItemId}`).addEventListener('click', () => quitarItem(it.ItemId));
      document.getElementById(`cantidad-${it.ItemId}`).addEventListener('change', (e) =>
        cambiarCantidad(it.ItemId, parseInt(e.target.value, 10) || 1)
      );
    });

    document.getElementById('btn-confirmar').addEventListener('click', confirmarReserva);
  } catch (err) {
    mostrarMensaje('No se pudo cargar tu carrito: ' + err.message);
  }
}

function renderFila(it) {
  return `
    <div class="fila-carrito">
      <div class="miniatura"><img src="${it.ImagenUrl || 'img/producto-placeholder.svg'}" alt="${it.ProductoNombre}" style="width:100%;height:100%;object-fit:cover;"></div>
      <div>
        <strong>${it.ProductoNombre}</strong><br>
        <span style="color:#7a756c; font-size:13px;">Talle ${it.Talle}</span>
      </div>
      <div>
        <input type="number" min="1" max="${it.StockDisponible}" value="${it.Cantidad}" id="cantidad-${it.ItemId}"
          style="width:56px; padding:6px; border:1px solid #ddd7cc;">
      </div>
      <div>${formatearPrecio(it.Cantidad * it.PrecioUnitario)}</div>
      <button class="btn btn-outline btn-chico" id="quitar-${it.ItemId}">Quitar</button>
    </div>
  `;
}

async function quitarItem(itemId) {
  try {
    await api(`/carrito/items/${itemId}`, { method: 'DELETE' });
    cargarCarrito();
  } catch (err) {
    mostrarMensaje(err.message);
  }
}

async function cambiarCantidad(itemId, cantidad) {
  try {
    await api(`/carrito/items/${itemId}`, { method: 'PUT', body: { cantidad } });
    cargarCarrito();
  } catch (err) {
    mostrarMensaje(err.message);
  }
}

async function confirmarReserva() {
  try {
    const datos = await api('/carrito/confirmar', { method: 'POST' });
    mostrarMensaje(datos.mensaje, 'ok');
    cargarCarrito();
  } catch (err) {
    mostrarMensaje(err.message);
  }
}

cargarCarrito();
