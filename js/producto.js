pintarHeader();
const productoId = new URLSearchParams(window.location.search).get('id');
const seleccionDetalle = {};

async function cargarProducto() {
  const zona = document.getElementById('detalle-producto');
  if (!productoId) { zona.innerHTML = '<div class="vacio">Producto no encontrado.</div>'; return; }
  try {
    const p = await api(`/productos/${productoId}`);
    const imagenes = p.imagenes?.length ? p.imagenes : (p.ImagenUrl ? [{ Url: p.ImagenUrl }] : []);
    zona.innerHTML = `<section class="producto-detalle"><div class="galeria-detalle"><div class="imagen-principal"><img id="imagen-principal" src="${imagenes.length ? imagenes[0].Url : 'img/producto-placeholder.svg'}" alt="${p.Nombre}"></div><div class="miniaturas">${imagenes.map((i, index) => `<button class="miniatura-detalle ${index === 0 ? 'activa' : ''}" data-url="${i.Url}"><img src="${i.Url}" alt="Vista ${index + 1} de ${p.Nombre}"></button>`).join('')}</div></div><div class="detalle-info"><span class="section-kicker">${p.Categoria || 'NASTYCREW'}</span><h1>${p.Nombre}</h1><p>${p.Descripcion || ''}</p><div class="precio">${formatearPrecio(p.Precio)}</div><div class="talles">${p.talles.map((t) => `<button class="talle-btn" data-talle="${t.Id}" ${t.Stock <= 0 ? 'disabled' : ''}>${t.Talle}</button>`).join('')}</div><button class="btn" id="reservar-producto">Reservar talle</button></div></section>`;
    zona.querySelectorAll('.miniatura-detalle').forEach((btn) => btn.addEventListener('click', () => { document.getElementById('imagen-principal').src = btn.dataset.url; zona.querySelectorAll('.miniatura-detalle').forEach((b) => b.classList.toggle('activa', b === btn)); }));
    zona.querySelectorAll('[data-talle]').forEach((btn) => btn.addEventListener('click', () => { seleccionDetalle.talleId = Number(btn.dataset.talle); zona.querySelectorAll('[data-talle]').forEach((b) => b.classList.toggle('seleccionado', b === btn)); }));
    document.getElementById('reservar-producto').addEventListener('click', reservar);
  } catch (err) { zona.innerHTML = `<div class="vacio">${err.message}</div>`; }
}
async function reservar() { if (!getUsuario()) { window.location.href = 'login.html'; return; } if (!seleccionDetalle.talleId) { alert('Elegí un talle antes de reservar.'); return; } await api('/carrito/items', { method:'POST', body:{ productoId:Number(productoId), talleId:seleccionDetalle.talleId, cantidad:1 } }); window.location.href = 'carrito.html'; }
cargarProducto();
