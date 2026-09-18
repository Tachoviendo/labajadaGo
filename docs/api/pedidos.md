# Recurso Pedidos

El recurso `/pedidos` son los pedidos de los clientes. Se crea a partir del
carrito del usuario logueado (checkout), pasa por un ciclo de estados
(`realizado` → `preparando` → `en_reparto` → `entregado`, con `cancelado`
como excepción que solo se puede alcanzar desde `realizado` o `preparando`)
y descuenta stock del catálogo cuando se confirma.

## Rutas

### GET /pedidos

Lista pedidos. La misma ruta sirve para dos casos:

- si el que consulta es **cliente**, se ignora cualquier filtro de usuario
  y le devuelve solo sus propios pedidos (HU-19).
- si es **cajero** o **dueño**, puede ver todos y filtrar por estado/fecha
  (HU-20).

Necesita login, sirve para cualquier rol (cambia lo que ve cada uno).

- 200: devuelve el listado según el rol y los filtros.
- 400: algún filtro mal, `fechaDesde`/`fechaHasta` invertidas o mal
  formadas, `page`/`limit` fuera de rango, `estado`/`sort` con un valor que
  no corresponde.
- 401: sin token.

---

### POST /pedidos

Confirma el pedido (checkout) a partir del carrito actual del usuario. El
body no lleva los items, se toman del carrito, que se vacía al confirmar.

Se relaciona con HU-14.

Cliente logueado.

- 201: pedido creado, con sus items, total y estado inicial `realizado`.
- 400: `metodoPago` con un valor que no es `mercadopago` ni `pos`,
  `direccionId` que falta o no es número.
- 401: sin token.
- 404: la `direccionId` no existe o no es del usuario.
- 409: el carrito está vacío, o algún item se quedó sin stock justo al
  confirmar (pudo cambiar desde que lo agregaste al carrito).

---

### GET /pedidos/{id}

Trae el detalle de un pedido (productos, total, dirección, método de pago,
estado).

Se relaciona con HU-18.

Necesita login. El cliente solo ve el suyo, cajero y dueño ven cualquiera.

- 200: devuelve el pedido.
- 400: `{id}` no es un número.
- 401: sin token.
- 403: sos cliente y el pedido es de otro usuario.
- 404: no existe ese pedido.

---

### PATCH /pedidos/{id}/estado

Avanza o retrocede el estado de un pedido.

Se relaciona con HU-21 y HU-22.

Cajero o dueño.

- 200: estado actualizado.
- 400: `estado` con un valor que no está en la lista (`realizado`,
  `preparando`, `en_reparto`, `entregado`, `cancelado`).
- 401: sin token.
- 403: sos cliente, esto no es para vos.
- 404: no existe ese pedido.
- 409: la transición no tiene sentido (por ejemplo saltear de `realizado`
  a `en_reparto` directo, o mover algo que ya está `entregado` o
  `cancelado`).

---

### DELETE /pedidos/{id}

Cancela un pedido. Solo se puede si todavía está en `realizado` o
`preparando`.

Se relaciona con HU-24.

Cliente, y tiene que ser su propio pedido.

- 204: cancelado (pasa a `estado: cancelado`), no devuelve nada.
- 401: sin token.
- 403: el pedido es de otro usuario.
- 404: no existe ese pedido.
- 409: el pedido ya pasó de estado (`en_reparto`, `entregado`) o ya estaba
  cancelado, así que no se puede cancelar de nuevo.

---

## Relación con historias de usuario

- GET `/pedidos` → HU-19, HU-20, historial del cliente / listado entrante.
- POST `/pedidos` → HU-14, confirmar pedido (checkout).
- GET `/pedidos/{id}` → HU-18, ver detalle y estado.
- PATCH `/pedidos/{id}/estado` → HU-21, HU-22, avanzar/retroceder estado.
- DELETE `/pedidos/{id}` → HU-24, cancelar pedido.

## Permisos

El cliente siempre está acotado a lo suyo (sus pedidos, cancelar solo los
propios). Cajero y dueño manejan el estado de cualquier pedido, pero no
pueden cancelar en nombre del cliente (esa ruta es solo cliente, dueño del
pedido).

## Sobre los conflictos (409)

Hay dos tipos acá: stock insuficiente al confirmar el checkout, y
transición de estado inválida (avanzar/retroceder mal, o cancelar algo que
ya está muy avanzado).
