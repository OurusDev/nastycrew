/* NASTYCREW — migración: categorías e imágenes múltiples
   Ejecutar UNA VEZ después del script inicial. No elimina productos ni reservas. */

BEGIN;

CREATE TABLE IF NOT EXISTS categorias (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL UNIQUE,
  slug VARCHAR(80) NOT NULL UNIQUE,
  orden INTEGER NOT NULL DEFAULT 0,
  activa BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO categorias (nombre, slug, orden) VALUES
  ('Remeras', 'remeras', 1),
  ('Pantalones', 'pantalones', 2),
  ('Buzos', 'buzos', 3),
  ('Outlet', 'outlet', 4)
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE productos ADD COLUMN IF NOT EXISTS categoria_id INTEGER REFERENCES categorias(id);

/* Los productos creados antes de esta migración quedan en Remeras. */
UPDATE productos
SET categoria_id = (SELECT id FROM categorias WHERE slug = 'remeras')
WHERE categoria_id IS NULL;

ALTER TABLE productos ALTER COLUMN categoria_id SET NOT NULL;

CREATE TABLE IF NOT EXISTS producto_imagenes (
  id SERIAL PRIMARY KEY,
  producto_id INTEGER NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  url VARCHAR(500) NOT NULL,
  orden INTEGER NOT NULL DEFAULT 0,
  UNIQUE (producto_id, orden)
);

/* Conserva la URL de imagen actual como primera imagen del producto. */
INSERT INTO producto_imagenes (producto_id, url, orden)
SELECT id, imagen_url, 1 FROM productos
WHERE COALESCE(TRIM(imagen_url), '') <> ''
  AND NOT EXISTS (SELECT 1 FROM producto_imagenes pi WHERE pi.producto_id = productos.id);

CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_producto_imagenes_producto ON producto_imagenes(producto_id, orden);

COMMIT;
