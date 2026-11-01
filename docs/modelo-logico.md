# Modelo lógico Kiosco La Bajada

Diagrama entidad-relación y atributos de las entidades del sistema, en base a las
[historias de usuario](./userStories.md).

## Diagrama

## Entidades y atributos

| Entidad | Atributos | Notas |
|---|---|---|
| **Usuario** | id, nombre, email (único), password_hash, telefono, rol (cliente/cajero/dueño), activo, fecha_creacion | Rol único con columna `rol` (no se separan tablas por rol). |
| **Direccion** | id, usuario_id (FK), calle, numero, ciudad, referencia, es_predeterminada | Un usuario puede tener varias direcciones (HU-04). |
| **Categoria** | id, nombre (único), descripcion | Gestionada por el dueño (HU-26). |
| **Producto** | id, nombre, descripcion, precio, categoria_id (FK), imagen_url, stock, activo | Stock se descuenta al confirmar pedido y se repone al cancelarlo, con triggers (HU-10). |
| **Carrito** | usuario_id (PK, FK), fecha_actualizacion | Un carrito activo por usuario (HU-11 a HU-13). |
| **Carrito_item** | carrito_id (PK, FK), producto_id (PK, FK), cantidad | La PK compuesta impide repetir un producto dentro del mismo carrito. |
| **Pedido** | id, usuario_id (FK), direccion_id (FK), direccion_calle, direccion_numero, direccion_ciudad, direccion_referencia, fecha_creacion, estado, metodo_pago, total | La dirección se copia al pedido para que no cambie si el usuario edita la suya. |
| **Pedido_item** | id, pedido_id (FK), producto_id (FK), cantidad, precio_unitario | `precio_unitario` es snapshot del precio al momento de la compra. |
| **Pedido_estado_historial** | id, pedido_id (FK), estado, fecha, usuario_id (FK) | Auditoría de avances/retrocesos de estado (HU-21, HU-22). |
| **Pago** | id, pedido_id (FK), metodo, estado, referencia_externa, fecha_pago, registrado_por (FK) | Un pedido puede tener varios pagos (ej: uno rechazado y otro pagado). `registrado_por` queda null si es MercadoPago. |

## Relaciones (cardinalidad)

- Usuario 1 - N Direccion
- Categoria 1 - N Producto
- Usuario 1 - 1 Carrito
- Carrito 1 - N Carrito_item . N - 1 Producto
- Usuario 1 - N Pedido, Direccion 1 - N Pedido
- Pedido 1 - N Pedido_item - N - 1 Producto
- Pedido 1 - N Pedido_estado_historial, Usuario 1 - N Pedido_estado_historial
- Pedido 1 - N Pago
