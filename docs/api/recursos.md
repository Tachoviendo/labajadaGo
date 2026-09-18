# Recursos de la API — Kiosco La Bajada

Este documento identifica los recursos principales de la API REST del sistema
Kiosco La Bajada, tomando como base las historias de usuario y el modelo lógico
del proyecto.

## Recursos identificados

### Usuarios

Representa las cuentas de los usuarios del sistema.

Incluye los distintos tipos de usuario:

- Cliente
- Cajero
- Dueño/Administrador

Historias relacionadas:

- HU-01 Registro de cliente
- HU-02 Inicio y cierre de sesión
- HU-03 Recuperación de contraseña
- HU-04 Edición de perfil
- HU-05 Alta de usuarios internos

Recurso:

`/usuarios`

---

### Direcciones

Representa las direcciones de entrega asociadas a los usuarios.

Un usuario puede tener varias direcciones y puede definir una dirección
predeterminada.

Historias relacionadas:

- HU-01 Registro de cliente
- HU-04 Edición de perfil
- HU-14 Confirmar pedido

Recurso:

`/direcciones`

---

### Categorías

Representa las categorías utilizadas para organizar los productos del
catálogo.

Historias relacionadas:

- HU-07 Buscar y filtrar productos
- HU-26 Gestión de categorías de productos

Recurso:

`/categorias`

---

### Productos

Representa los productos disponibles en el catálogo del kiosco.

Incluye información como nombre, descripción, precio, categoría, imagen,
stock y estado de disponibilidad.

Historias relacionadas:

- HU-06 Ver catálogo de productos
- HU-07 Buscar y filtrar productos
- HU-08 Alta de productos
- HU-09 Edición y baja de productos
- HU-10 Control de stock

Recurso:

`/productos`

---

### Carrito

Representa el carrito de compras activo de un usuario.

El carrito permite agregar productos, modificar cantidades y eliminar
productos antes de confirmar un pedido.

Historias relacionadas:

- HU-11 Agregar productos al carrito
- HU-12 Modificar y eliminar ítems del carrito
- HU-13 Persistencia del carrito
- HU-14 Confirmar pedido

Recurso:

`/carrito`

---

### Pedidos

Representa las compras realizadas por los clientes.

Un pedido contiene sus productos, cantidades, precios al momento de la
compra, dirección de entrega, método de pago, total y estado.

Historias relacionadas:

- HU-14 Confirmar pedido
- HU-18 Ver estado del pedido
- HU-19 Historial de pedidos
- HU-20 Ver listado de pedidos entrantes
- HU-21 Avanzar el estado de un pedido
- HU-22 Retroceder el estado de un pedido
- HU-24 Cancelar un pedido
- HU-25 Panel de control de pedidos y ventas

Recurso:

`/pedidos`

---

### Pagos

Representa el pago asociado a un pedido.

Contempla los métodos de pago definidos por el proyecto, incluyendo
MercadoPago y pago mediante POS al momento de la entrega.

Historias relacionadas:

- HU-15 Pago con MercadoPago
- HU-16 Pago con POS al recibir
- HU-17 Registrar cobro en la entrega

Recurso:

`/pagos`

> Las funcionalidades de pago son consideradas Nice to Have para el MVP,
> pero el recurso se contempla dentro del diseño general de la API.

---

## Resumen de recursos

| Recurso     | URL base       | Historias principales |
| ----------- | -------------- | --------------------- |
| Usuarios    | `/usuarios`    | HU-01 a HU-05         |
| Direcciones | `/direcciones` | HU-01, HU-04, HU-14   |
| Categorías  | `/categorias`  | HU-07, HU-26          |
| Productos   | `/productos`   | HU-06 a HU-10         |
| Carrito     | `/carrito`     | HU-11 a HU-14         |
| Pedidos     | `/pedidos`     | HU-14, HU-18 a HU-25  |
| Pagos       | `/pagos`       | HU-15 a HU-17         |

## Operaciones de autenticación

Las operaciones de autenticación se consideran operaciones transversales
del sistema y no un recurso de negocio independiente.

Incluyen:

- Inicio de sesión.
- Cierre de sesión.
- Recuperación de contraseña.

Las rutas correspondientes se definirán posteriormente en el diseño
detallado de la API.
