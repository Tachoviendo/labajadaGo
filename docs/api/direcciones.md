# Recurso Direcciones

El recurso `/direcciones` son las direcciones de entrega de un cliente. Un
usuario puede tener varias. La propiedad `usuario_id` vincula cada dirección
nueva con su dueño; las direcciones históricas sin propietario verificable
quedan sin asignar y no aparecen en las consultas de clientes.

`esPredeterminada` sigue definido en el schema de la API, pero todavía no se
persiste en la base. Por ahora las respuestas indican `false` y solicitar
`true` al crear o modificar devuelve 400.

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
  del largo permitido; también si se intenta activar `esPredeterminada`, que
  todavía no se persiste.
- 401: sin token.

---

### PATCH /direcciones/{id}

Modifica una dirección del usuario logueado.

Se relaciona con HU-04.

Cliente logueado, solo direcciones propias.

- 200: modificada.
- 400: `{id}` inválido, body vacío, o algún campo fuera de rango.
- 400: se intenta activar `esPredeterminada`, propiedad aún no soportada por
  la persistencia.
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

## Direcciones históricas y bases existentes

`db/schema.sql` agrega `usuario_id` nullable para conservar direcciones cuyo
propietario no se puede demostrar. No se asigna propietario por el hecho de
que un pedido use esa dirección. Las referencias existentes de `pedido` a
`direccion` se mantienen; una dirección histórica sin dueño queda fuera del
listado y no puede consultarse ni modificarse desde la API de clientes.

El script de schema se ejecuta al inicializar un volumen de PostgreSQL nuevo.
Modificarlo no actualiza una base existente; esta requiere una migración
separada que no forma parte de esta etapa.
