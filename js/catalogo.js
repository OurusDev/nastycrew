pintarHeader();

const seleccionTalle = {};
let categoriaActiva = 'todas';
let productosCatalogo = [];

async function cargarCatalogo() {
  const grilla = document.getElementById('grilla');
  const mensajeCarga = document.getElementById('mensaje-carga');
  try {
    const [productos, categorias] = await Promise.all([api('/productos'), api('/productos/categorias')]);
    productosCatalogo = productos;
    mensajeCarga.style.display = 'none';
    renderCategorias(categorias);
    renderProductos();
  } catch (err) {
    mensajeCarga.textContent = 'No se pudo conectar con el servidor. ¿Está corriendo el backend?';
  }
}

function renderCategorias(categorias) {
  const zona = document.getElementById('categorias');
  zona.innerHTML = `<button class="categoria-btn activa" data-slug="todas">Todo <span>${productosCatalogo.length}</span></button>${categorias.map((c) =>
    `<button class="categoria-btn" data-slug="${c.Slug}">${c.Nombre} <span>${c.CantidadProductos || 'Próximamente'}</span></button>`
  ).join('')}`;
  zona.querySelectorAll('.categoria-btn').forEach((btn) => btn.addEventListener('click', () => {
    categoriaActiva = btn.dataset.slug;
    zona.querySelectorAll('.categoria-btn').forEach((b) => b.classList.toggle('activa', b === btn));
    renderProductos();
  }));
}

function renderProductos() {
  const grilla = document.getElementById('grilla');
  const filtrados = categoriaActiva === 'todas' ? productosCatalogo : productosCatalogo.filter((p) => p.CategoriaSlug === categoriaActiva);
  if (!filtrados.length) {
    grilla.innerHTML = '<div class="vacio proximo"><strong>Próximamente</strong><br>Estamos preparando piezas nuevas para esta categoría.</div>';
    return;
  }
  grilla.innerHTML = filtrados.map(renderTarjeta).join('');
  filtrados.forEach((p) => {
    p.talles.forEach((t) => document.getElementById(`talle-${p.Id}-${t.Id}`)?.addEventListener('click', () => seleccionarTalle(p.Id, t.Id)));
    document.getElementById(`agregar-${p.Id}`).addEventListener('click', () => agregarAlCarrito(p.Id));
  });
}

function renderTarjeta(p) {
  const imagenes = p.imagenes?.length ? p.imagenes : (p.ImagenUrl ? [{ Url: p.ImagenUrl }] : []);
  const slides = imagenes.length ? imagenes.map((img, i) => `<img class="slide ${i === 0 ? 'activa' : ''}" src="${img.Url}" alt="${p.Nombre}" loading="lazy">`).join('') : 'Sin imagen';
  const talles = p.talles.map((t) => `<button class="talle-btn" id="talle-${p.Id}-${t.Id}" ${t.Stock <= 0 ? 'disabled title="Sin stock"' : ''}>${t.Talle}</button>`).join('');
  return `<article class="tarjeta-producto">
    <div class="imagen slider-catalogo" data-slider="${p.Id}">${slides}${imagenes.length > 1 ? `<button class="slide-control prev" aria-label="Imagen anterior">←</button><button class="slide-control next" aria-label="Imagen siguiente">→</button><span class="slide-count">1/${imagenes.length}</span>` : ''}</div>
    <div class="info"><div class="producto-meta"><span>${p.Categoria || 'NASTY/01'}</span><span>Disponible</span></div><h3>${p.Nombre}</h3><div class="descripcion">${p.Descripcion || ''}</div><a class="ver-detalle" href="producto.html?id=${p.Id}">Más información <b>↗</b></a><div class="talles">${talles}</div><div class="precio">${formatearPrecio(p.Precio)}</div><button class="btn" id="agregar-${p.Id}">Reservar talle</button></div>
  </article>`;
}

document.addEventListener('click', (event) => {
  const control = event.target.closest('.slide-control');
  if (!control) return;
  const slider = control.closest('.slider-catalogo');
  const slides = [...slider.querySelectorAll('.slide')];
  const actual = slides.findIndex((s) => s.classList.contains('activa'));
  const siguiente = (actual + (control.classList.contains('next') ? 1 : -1) + slides.length) % slides.length;
  slides[actual].classList.remove('activa'); slides[siguiente].classList.add('activa');
  slider.querySelector('.slide-count').textContent = `${siguiente + 1}/${slides.length}`;
});

function seleccionarTalle(productoId, talleId) {
  seleccionTalle[productoId] = talleId;
  document.querySelectorAll(`[id^="talle-${productoId}-"]`).forEach((btn) => btn.classList.toggle('seleccionado', btn.id === `talle-${productoId}-${talleId}`));
}

async function agregarAlCarrito(productoId) {
  if (!getUsuario()) { window.location.href = 'login.html'; return; }
  const talleId = seleccionTalle[productoId];
  if (!talleId) { alert('Elegí un talle antes de reservar.'); return; }
  try {
    await api('/carrito/items', { method: 'POST', body: { productoId, talleId, cantidad: 1 } });
    if (confirm('¡Agregado a tu carrito! ¿Querés ir a verlo ahora?')) window.location.href = 'carrito.html';
  } catch (err) { alert(err.message); }
}

cargarCatalogo();
