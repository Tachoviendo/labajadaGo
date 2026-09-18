# Recurso Usuarios

El recurso `/usuarios` son las cuentas del sistema (cliente, cajero, dueño).
El `email` es único y nunca se devuelve la password en las respuestas
(`UserSchema`).

## Rutas

### GET /usuarios

Lista usuarios internos, con filtro opcional por `rol`/`activo`.

Se relaciona con HU-05.

Solo dueño.

- 200: devuelve el listado según los filtros.
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

Desactiva un usuario (`activo` pasa a `false`, baja lógica, no se borra el
registro).

Solo dueño.

- 204: desactivado, no devuelve nada.
- 401: sin token.
- 403: no sos dueño.
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

## Pendiente

`schemas/user.schema.js` ya tiene `CreateInternalUserBody` (alta de
cajero/dueño por el dueño, HU-05) pero todavía no hay una ruta `POST
/usuarios` en `src/routes/users.routes.js` que la use. Falta documentar
cuando se implemente.
