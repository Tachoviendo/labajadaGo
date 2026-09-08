# Modelo lógico — Kiosco La Bajada

Diagrama entidad-relación y atributos de las entidades del sistema, en base a las
[historias de usuario](./userStories.md).

## Diagrama

## Entidades y atributos

| Entidad | Atributos | Notas |
|---|---|---|
| **Usuario** | id, nombre, email (único), password_hash, telefono, rol (cliente/cajero/dueño), activo, fecha_creacion | Rol único con columna `rol` (no se separan tablas por rol). |
| **Direccion** | id, usuario_id (FK), calle, numero, ciudad, referencia, es_predeterminada | Un usuario puede tener varias direcciones (HU-04). |
| **Categoria** | id, nombre (único), descripcion | Gestionada por el dueño (HU-26). |
| **Producto** | id, nombre, descripcion, precio, categoria_id (FK), imagen_url, stock, activo | Stock se descuenta al confirmar pedido (HU-10). |
| **Carrito** | id, usuario_id (FK, único), fecha_actualizacion | Un carrito activo por usuario (HU-11 a HU-13). |
| **Carrito_item** | id, carrito_id (FK), producto_id (FK), cantidad | Un producto no debería repetirse dentro del mismo carrito. |
| **Pedido** | id, usuario_id (FK), direccion_id (FK), fecha_creacion, estado, metodo_pago, total | . |
| **Pedido_item** | id, pedido_id (FK), producto_id (FK), cantidad, precio_unitario | `precio_unitario` es snapshot del precio al momento de la compra. |
| **Pedido_estado_historial** | id, pedido_id (FK), estado, fecha, usuario_id (FK) | Auditoría de avances/retrocesos de estado (HU-21, HU-22). |
| **Pago** | id, pedido_id (FK, único), metodo, estado, referencia_externa, fecha_pago, registrado_por (FK) | Un pago por pedido. `registrado_por` queda null si es MercadoPago. |

## Relaciones (cardinalidad)

- Usuario 1 — N Direccion
- Categoria 1 — N Producto
- Usuario 1 — 1 Carrito
- Carrito 1 — N Carrito_item — N — 1 Producto
- Usuario 1 — N Pedido, Direccion 1 — N Pedido
- Pedido 1 — N Pedido_item — N — 1 Producto
- Pedido 1 — N Pedido_estado_historial, Usuario 1 — N Pedido_estado_historial
- Pedido 1 — 1 Pago
