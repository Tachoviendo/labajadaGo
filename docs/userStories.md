# Historias de Usuario — Kiosco La Bajada

Convenciones:

- Formato: **Como** [rol], **quiero** [acción], **para** [beneficio].
- Cada historia incluye **Criterios de aceptación**.
- Roles: **Cliente**, **Cajero**, **Dueño/Administrador**.



## Epica 1: Cuentas de usuario y autenticación

### HU-01 Registro de cliente
**Como** cliente, **quiero** crear una cuenta con mis datos (nombre, email, teléfono, dirección),
**para** poder realizar pedidos y hacerles seguimiento.

### HU-02 Inicio y cierre de sesión
**Como** usuario (cliente, cajero o dueño), **quiero** iniciar y cerrar sesión con mi cuenta,
**para** acceder únicamente a las funciones que me corresponden.

### HU-03 Recuperación de contraseña
**Como** usuario, **quiero** poder recuperar mi contraseña si la olvido,
**para** no perder el acceso a mi cuenta.

### HU-04 Edición de perfil
**Como** cliente, **quiero** editar mis datos personales y direcciones de entrega,
**para** mantener mi información actualizada al momento de pedir.

### HU-05 Alta de usuarios internos (cajero)
**Como** dueño, **quiero** crear cuentas de usuario para mis empleados/cajeros con permisos
limitados, **para** que puedan operar el sistema sin acceder a funciones administrativas.

---

## Epica 2: Catálogo de productos

### HU-06  Ver catálogo de productos
**Como** cliente, **quiero** ver el listado de productos disponibles con su nombre, foto, precio
y descripción, **para** decidir qué comprar.

### HU-07 — Buscar y filtrar productos
**Como** cliente, **quiero** buscar productos por nombre o categoría,
**para** encontrar rápidamente lo que necesito.

### HU-08 — Alta de productos
**Como** dueño, **quiero** cargar nuevos productos indicando nombre, descripción, precio,
categoría, imagen y stock, **para** que estén disponibles para la venta online.

### HU-09 — Edición y baja de productos
**Como** dueño, **quiero** modificar precio, stock, descripción o imagen de un producto existente,
y poder desactivarlo o eliminarlo, **para** mantener el catálogo actualizado.

### HU-10 — Control de stock
**Como** dueño, **quiero** que el stock de un producto se descuente automáticamente al confirmarse
un pedido, **para** evitar vender productos que no tengo disponibles.

---

## Epica 3: Carrito de compras y checkout

### HU-11 — Agregar productos al carrito
**Como** cliente, **quiero** agregar productos al carrito indicando cantidad,
**para** ir armando mi pedido antes de confirmarlo.

### HU-12 — Modificar y eliminar ítems del carrito
**Como** cliente, **quiero** cambiar la cantidad de un producto en el carrito o quitarlo,
**para** ajustar mi pedido antes de confirmarlo.

### HU-13 — Persistencia del carrito
**Como** cliente, **quiero** que mi carrito se mantenga guardado mientras sigo navegando o si
cierro y vuelvo a entrar antes de confirmar el pedido, **para** no perder lo que ya elegí.


### HU-14 — Confirmar pedido (checkout)
**Como** cliente, **quiero** revisar mi carrito y confirmar el pedido eligiendo dirección de
entrega y método de pago, **para** iniciar el proceso de compra.

---

## Epic 4: Pagos

esto claramente es un NICE TO HAVE BUT NOT NECESSARY 

### HU-15 Pago con MercadoPago
**Como** cliente, **quiero** pagar mi pedido online a través de MercadoPago al confirmarlo,
**para** completar la compra sin necesidad de efectivo al recibirlo.


### HU-16  Pago con POS al recibir
**Como** cliente, **quiero** elegir pagar con posnet al momento de recibir mi pedido en la puerta,
**para** pagar en el momento de la entrega sin usar MercadoPago.

esto es literamente que ponga pago con pos el empleado al entregar el pedido. 

### HU-17 Registrar cobro en la entrega
**Como** cajero, **quiero** marcar un pedido como pagado cuando se cobra con POS en la entrega,
**para** llevar un registro correcto de qué pedidos ya fueron cobrados.
---

## Epica 5:  Seguimiento y gestión del estado del pedido

### HU-18  Ver estado del pedido (cliente)
**Como** cliente, **quiero** ver en qué etapa se encuentra mi pedido,
**para** saber cuándo va a llegar.


- El cliente puede ver el estado actual entre: *Pedido realizado*, *Preparando tu pedido*,
  *Pedido en reparto*, *Pedido entregado*.
- El cliente puede acceder al detalle del pedido (productos, total, dirección, método de pago).

### HU-19  Historial de pedidos del cliente
**Como** cliente, **quiero** ver el listado de mis pedidos anteriores,
**para** consultar compras pasadas y repetir un pedido si quiero.


### HU-20 Ver listado de pedidos entrantes (cajero/dueño)
**Como** cajero, **quiero** ver todos los pedidos activos ordenados por estado o fecha,
**para** saber cuáles hay que preparar o entregar.


### HU-21  Avanzar el estado de un pedido
**Como** cajero, **quiero** avanzar el estado de un pedido a la siguiente etapa,
**para** reflejar el progreso real de la preparación y entrega.

### HU-22  Retroceder el estado de un pedido
**Como** cajero, **quiero** poder retroceder el estado de un pedido a una etapa anterior,
**para** corregir errores de carga o cambios en la operación (ej. un pedido marcado como "en
reparto" por error).

### HU-23  Notificación de cambio de estado
**Como** cliente, **quiero** ser notificado cuando mi pedido cambia de estado,
**para** enterarme sin tener que estar revisando la web constantemente.

mailing?

### HU-24 Cancelar un pedido
**Como** cliente, **quiero** poder cancelar mi pedido mientras todavía está en estado "Pedido
realizado" o "preparando", **para** arrepentirme de la compra antes de que empiece a prepararse.

---

## Epica 6 Administración general (dueño)

### HU-25  Panel de control de pedidos y ventas
**Como** dueño, **quiero** ver un panel con los pedidos del día y el total vendido,
**para** tener visibilidad del negocio sin tener que revisar pedido por pedido.

### HU-26  Gestión de categorías de productos
**Como** dueño, **quiero** crear y editar categorías de productos,
**para** organizar el catálogo de forma clara para los clientes.

---


1. Registro/login de clientes y roles (HU-01, HU-02, HU-05).
2. Catálogo de productos y su administración (HU-06, HU-08, HU-09).
3. Carrito de compras y checkout (HU-11, HU-12, HU-14).
4. Pago con MercadoPago y POS al recibir (HU-15, HU-16, HU-17).
5. Estados del pedido y seguimiento (HU-18, HU-20, HU-21, HU-22).
6. Resto de historias (búsqueda, historial, notificaciones, panel, cancelación) como
   incrementales sobre el MVP.
