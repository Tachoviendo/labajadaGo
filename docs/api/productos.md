# Recurso Productos

El recurso `/productos` es el catálogo. Cada producto es de una categoría
(`categoriaId`) y tiene stock, que se descuenta cuando se confirma un pedido
(HU-10).

## Rutas

### GET /productos

Lista y filtra el catálogo (nombre, categoría, rango de precio, orden,
paginación).

Se relaciona con HU-06 y HU-07.

Pública. Por defecto solo se muestran los productos con `activo=true`; el
dueño puede pedir `activo=false` para ver los que están de baja.

- 200: devuelve el listado (vacío si no hay coincidencias).
- 400: algún filtro viene mal, por ejemplo `precioMin` más grande que
  `precioMax`, `page`/`limit` fuera de rango, o `sort` con un valor que no
  está en la lista permitida.

---

### GET /productos/{id}

Trae un producto puntual.

Se relaciona con HU-06.

Pública.

- 200: existe, lo devuelve.
- 400: el `{id}` no es un número.
- 404: no hay ningún producto con ese id.

---

### POST /productos

Crea un producto nuevo.

Se relaciona con HU-08.

Necesita login como dueño.

- 201: creado, devuelve el producto con su id.
- 400: `nombre` fuera de rango, `precio` o `stock` negativos, `imagenUrl`
  con formato raro, o `categoriaId` que falta o no es número.
- 401: sin token o token inválido.
- 403: logueado pero no sos dueño.
- 404: el `categoriaId` que mandaste no existe.

---

### PATCH /productos/{id}

Modifica un producto (precio, stock, descripción, imagen, categoría o el
flag `activo`).

Se relaciona con HU-09.

Solo dueño.

- 200: se modificó, devuelve el producto actualizado.
- 400: `{id}` inválido, el body viene vacío, o algún campo no cumple sus
  reglas (por ejemplo `precio` negativo).
- 401: sin token.
- 403: no sos dueño.
- 404: no existe el producto, o el `categoriaId` nuevo no existe.

---

### DELETE /productos/{id}

Da de baja un producto (baja lógica, pasa `activo` a `false`, no lo borra
de la base).

Se relaciona con HU-09.

Solo dueño.

- 204: desactivado, no devuelve nada.
- 401: sin token.
- 403: no sos dueño.
- 404: no existe ese producto.

---

## Relación con historias de usuario

- GET `/productos` → HU-06, HU-07, ver y filtrar catálogo.
- GET `/productos/{id}` → HU-06, ver el detalle de un producto.
- POST `/productos` → HU-08, alta de producto.
- PATCH `/productos/{id}` → HU-09, editar producto.
- DELETE `/productos/{id}` → HU-09, dar de baja un producto.

## Permisos

Los GET son públicos. Todo lo que crea o modifica el catálogo
(POST/PATCH/DELETE) es exclusivo del dueño.

## Sobre el stock

Este recurso no descuenta stock directo, eso pasa al confirmar el pedido.
Los conflictos de stock (409) están documentados en
[pedidos.md](./pedidos.md) y [carrito.md](./carrito.md).
