# Recurso Usuarios

El recurso `/usuarios` son las cuentas del sistema (cliente, cajero, dueño).
El `email` es único y nunca se devuelve la password en las respuestas
(`UserSchema`).

## Rutas

### GET /usuarios

Lista usuarios internos, con filtro opcional por `rol`/`activo`.

Se relaciona con HU-05.

Solo dueño.

- 200: devuelve `{ data, pagination }`. `data` son los usuarios y
  `pagination.total` la cantidad total que cumple los filtros. Acepta
  `page` y `limit` (máximo 100).
- 400: `rol` con un valor que no corresponde, `activo` que no es booleano.
- 401: sin token.
- 403: no sos dueño.

---

### GET /usuarios/{id}

Trae el detalle de un usuario.

Se relaciona con HU-04.

Cualquiera logueado puede ver su propio perfil; el dueño puede ver a
cualquiera.

- 200: devuelve el usuario.
- 400: `{id}` no es un número.
- 401: sin token.
- 403: no sos dueño y el `{id}` no es tu propio perfil.
- 404: no existe ese usuario.

---

### POST /usuarios

Crea una cuenta interna (cajero o dueño). Los clientes no se crean acá,
se registran con `/auth/register`.

Se relaciona con HU-05.

Solo para dueño.

- 201: creado, devuelve el usuario.
- 400: algún campo mal, o `rol` que no es `cajero`/`dueno`.
- 401: sin token.
- 403: no sos dueño.
- 409: ya existe una cuenta con ese email.

---

### PATCH /usuarios/{id}

Deja que un usuario edite sus propios datos (nombre, email, teléfono,
password). No se puede cambiar `rol` ni `activo` acá, eso es aparte, con
`/admin`.

Se relaciona con HU-04.

Cualquier rol, pero solo sobre su propio perfil.

- 200: perfil actualizado.
- 400: `{id}` inválido, body vacío, o algún campo mal (email inválido,
  password corta, etc.).
- 401: sin token.
- 403: el `{id}` no es el tuyo.
- 404: no existe ese usuario.
- 409: el email nuevo ya lo usa otra cuenta.

---

### PATCH /usuarios/{id}/admin

Deja que el dueño active/desactive una cuenta, o le cambie el rol a un
usuario interno (cajero/dueño).

Se relaciona con HU-05.

Solo dueño.

- 200: cuenta actualizada.
- 400: `{id}` inválido, body vacío, o `rol` con un valor que no
  corresponde (no se puede poner `cliente` por acá).
- 401: sin token.
- 403: no sos dueño.
- 404: no existe ese usuario.

---

### DELETE /usuarios/{id}

Da de baja un usuario. Por la Ley 18.331 se borran sus datos personales
(nombre, email y teléfono quedan anónimos) y la cuenta queda desactivada.
No se borra el registro porque los pedidos y pagos lo siguen usando.

 Para el propio usuario (darse de baja) o el dueño.

- 204: dado de baja, no devuelve nada.
- 400: `{id}` no es un número.
- 401: sin token.
- 403: no sos dueño y el `{id}` no es el tuyo.
- 404: no existe ese usuario.

---

## Relación con historias de usuario

- GET `/usuarios` → HU-05, listar usuarios internos.
- GET `/usuarios/{id}` → HU-04, ver perfil propio (o de otro si sos dueño).
- PATCH `/usuarios/{id}` → HU-04, editar perfil propio.
- PATCH `/usuarios/{id}/admin` → HU-05, activar/desactivar o cambiar rol.
- DELETE `/usuarios/{id}` → HU-05, dar de baja un usuario.

## Permisos

Cada uno edita/ve lo suyo, salvo el dueño que tiene acceso a todo. Lo que
es exclusivamente administrativo (listar todos, cambiar rol, desactivar
cuentas) es solo dueño.
