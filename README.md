# labajadaGo
Proyecto de dw2026

## Idea del proyecto

**Kiosco La Bajada** Busca realizar pedidos online pero como en bella unión no está pedidos ya el proyecto busca generar una webde **pedidos online**, que permita a los clientes comprar sin tener que ir presencialmente o llamar por teléfono, y que le dé al kiosco
una herramienta simple para gestionar esos pedidos de punta a punta.

### Objetivo

Construir un sistema donde:

- Los **clientes** puedan registrarse, navegar el catálogo de productos, armar un carrito de
  compras, confirmar un pedido, pagarlo (online con MercadoPago o en persona con POS al recibirlo)
  y hacer seguimiento del estado de su pedido en tiempo real.
- El **dueño del kiosco** pueda administrar el catálogo (alta, baja y modificación de productos)
  y tenga visibilidad completa sobre los pedidos.
- El **cajero/empleado** pueda operar el día a día: ver los pedidos entrantes y actualizar el
  estado de cada uno a medida que se van preparando y entregando, con un nivel de acceso más
  acotado que el del dueño.

### Roles del sistema

| Rol | Descripción |
|---|---|
| **Cliente** | Usuario final que compra productos a través de la web. |
| **Cajero / Empleado** | Usuario interno con acceso limitado a la gestión operativa de pedidos. |
| **Dueño / Administrador** | Usuario interno con acceso total: gestión de productos, usuarios y pedidos. |

### Flujo de un pedido

Cada pedido, una vez confirmado, atraviesa un ciclo de estados que tanto el cliente como el
personal del kiosco pueden visualizar:

1. **Pedido realizado**
2. **Preparando tu pedido**
3. **Pedido en reparto**
4. **Pedido entregado**

El personal del kiosco puede avanzar o retroceder el pedido entre estas etapas, y el cliente
puede seguir el progreso desde su cuenta.

### Medios de pago

- **MercadoPago**: pago online al momento de confirmar el pedido.
- **POS al recibir**: pago en el momento de la entrega, con posnet físico en la puerta.


### Historias de Usuario
en el siguiente archivo listamos las épicas y las historias de usuario: [userStories.md](./userStories.md).

### El orden en las epicas que buscaremos seguir
1. Registro/login de clientes y roles (HU-01, HU-02, HU-05).
2. Catálogo de productos y su administración (HU-06, HU-08, HU-09).
3. Carrito de compras y checkout (HU-11, HU-12, HU-14).
4. Pago con MercadoPago y POS al recibir (HU-15, HU-16, HU-17).
5. Estados del pedido y seguimiento (HU-18, HU-20, HU-21, HU-22).
6. Resto de historias (búsqueda, historial, notificaciones, panel, cancelación) como
   incrementales sobre el MVP.
