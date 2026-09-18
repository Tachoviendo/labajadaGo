# Recurso Direcciones

El recurso `/direcciones` son las direcciones de entrega de un cliente. Un
usuario puede tener varias, y puede marcar una como predeterminada
(`esPredeterminada`).

## Rutas

### GET /direcciones

Lista las direcciones del usuario logueado.

Se relaciona con HU-04.

Cliente logueado.

- 200: devuelve las direcciones (vacío si no cargó ninguna).
- 401: sin token.

---

### GET /direcciones/{id}

Trae una dirección puntual del usuario logueado.

Se relaciona con HU-04.

Cliente logueado, solo direcciones propias.

- 200: devuelve la dirección.
- 400: el `{id}` no es un número.
- 401: sin token.
- 403: esa dirección es de otro usuario.
- 404: no existe esa dirección.

---

### POST /direcciones

Crea una dirección nueva para el usuario logueado.

Se relaciona con HU-04.

Cliente logueado.

- 201: creada, devuelve la dirección con su id.
- 400: `calle`/`ciudad` fuera de rango, o `numero`/`referencia` se pasan
  del largo permitido.
- 401: sin token.

---

### PATCH /direcciones/{id}

Modifica una dirección del usuario logueado.

Se relaciona con HU-04.

Cliente logueado, solo direcciones propias.

- 200: modificada.
- 400: `{id}` inválido, body vacío, o algún campo fuera de rango.
- 401: sin token.
- 403: esa dirección es de otro usuario.
- 404: no existe esa dirección.

---

## Relación con historias de usuario

- GET `/direcciones` → HU-04, listar direcciones propias.
- GET `/direcciones/{id}` → HU-04, ver una dirección.
- POST `/direcciones` → HU-04, agregar dirección.
- PATCH `/direcciones/{id}` → HU-04, editar dirección.

## Permisos

Todo esto es cliente logueado y siempre acotado a las direcciones propias.
No hay forma de ver/editar la dirección de otro usuario.
