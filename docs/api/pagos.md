# Recurso Pagos

El recurso `/pagos` es el pago asociado a un pedido (uno a uno). Hay dos
métodos: **MercadoPago** (pago online al confirmar el pedido) y **POS**
(pago en persona al entregar, lo registra un cajero).

## Rutas

### GET /pagos/{id}

Trae el detalle de un pago.

Necesita login. El cliente solo puede ver el pago de su propio pedido,
cajero y dueño ven cualquiera.

- 200: devuelve el pago.
- 400: `{id}` no es un número.
- 401: sin token.
- 403: sos cliente y ese pago es de un pedido de otro usuario.
- 404: no existe ese pago.

---

### POST /pagos/mercadopago

Arranca un pago con MercadoPago para un pedido con `metodoPago:
mercadopago`. Devuelve la url de checkout para redirigir al cliente.

Se relaciona con HU-15.

Cliente logueado, dueño del pedido a pagar.

- 201: pago iniciado, devuelve el pago (`pendiente`) y la `checkoutUrl`.
- 400: el body viene mal (por ejemplo `pedidoId` que falta o no es
  número, según como quede el contrato final).
- 401: sin token.
- 403: el pedido es de otro usuario.
- 404: no existe ese pedido.
- 409: el pedido no es `metodoPago: mercadopago`, o ya tiene un pago
  hecho/en curso.

---

### PATCH /pagos/{id}/pos

Registra el cobro de un pedido pagado con POS al entregar. No aplica a
MercadoPago (ese se confirma solo, vía callback).

Se relaciona con HU-17.

Cajero o dueño.

- 200: pago registrado como `pagado`.
- 400: `referenciaExterna` se pasa del largo permitido.
- 401: sin token.
- 403: sos cliente, esto es del cajero/dueño.
- 404: no existe ese pago.
- 409: el pago no es de método `pos` (es MercadoPago), o ya estaba
  registrado como pagado.

---

## Relación con historias de usuario

- GET `/pagos/{id}` → HU-15, HU-16, consultar el pago de un pedido.
- POST `/pagos/mercadopago` → HU-15, iniciar pago online.
- PATCH `/pagos/{id}/pos` → HU-17, registrar cobro POS al entregar.

## Permisos

El cliente ve/paga lo suyo. Registrar el cobro POS es tarea del cajero (o
dueño), tiene sentido porque es quien recibe el pedido en la puerta.
