# Recurso Carrito

El recurso `/carrito` es el carrito del cliente logueado. Cada usuario tiene
un único carrito activo, y se mantiene guardado entre sesiones hasta que
confirma el pedido (HU-13).

## Rutas

### GET /carrito

Trae el carrito del usuario logueado, con sus items y el total.

Se relaciona con HU-13.

Necesita login, rol cliente.

- 200: devuelve el carrito (vacío si todavía no cargó nada).
- 401: sin token o inválido.

---

### POST /carrito/items

Agrega un producto al carrito. Si el producto ya estaba, suma la cantidad
en vez de duplicar el item.

Se relaciona con HU-11.

Cliente logueado.

- 201: agregado (o sumado), devuelve el item.
- 400: `cantidad` menor a 1 o mayor a 999, `productoId` que falta o no es
  número.
- 401: sin token.
- 404: el `productoId` no existe (o está inactivo).
- 409: no hay stock suficiente para la cantidad pedida.

---

### PATCH /carrito/items/{productoId}

Cambia la cantidad de un item que ya está en el carrito. Cantidad 0 no se
permite, para eso está el DELETE.

Se relaciona con HU-12.

Cliente logueado.

- 200: cantidad actualizada.
- 400: `cantidad` fuera de rango, o `{productoId}` no es un número válido.
- 401: sin token.
- 404: ese producto no está en el carrito del usuario (o no existe).
- 409: no hay stock suficiente para la nueva cantidad.

---

### DELETE /carrito/items/{productoId}

Saca un producto del carrito.

Se relaciona con HU-12.

Cliente logueado.

- 204: sacado, no devuelve nada.
- 401: sin token.
- 404: ese producto no está en el carrito.

---

## Relación con historias de usuario

- GET `/carrito` → HU-13, ver el carrito persistido.
- POST `/carrito/items` → HU-11, agregar producto.
- PATCH `/carrito/items/{productoId}` → HU-12, modificar cantidad.
- DELETE `/carrito/items/{productoId}` → HU-12, sacar un item.

## Permisos

Todo `/carrito` es cliente logueado, siempre operando sobre su propio
carrito (no hay forma de ver el carrito de otro usuario, así que acá no
aplica un 403 tipo "carrito ajeno", el carrito sale directo del token).

## Sobre el stock

El 409 en agregar/modificar item es cuando pedís más cantidad de la que
hay de stock del producto.
