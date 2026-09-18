# Recurso Categorías

El recurso `/categorias` representa las categorías utilizadas para organizar
los productos del catálogo de Kiosco La Bajada.

Cada categoría posee:

- Identificador.
- Nombre.
- Descripción.

El nombre de la categoría es único.

## Rutas

### GET /categorias

Obtiene el listado de categorías disponibles.

Esta operación permite consultar las categorías utilizadas para organizar
y filtrar los productos del catálogo.

Se relaciona principalmente con HU-07.

Es pública, no hace falta estar logueado.

- 200: devuelve el listado (puede venir vacío si todavía no se cargó ninguna).

---

### GET /categorias/{id}

Obtiene una categoría específica mediante su identificador.

También pública.

- 200: la categoría existe, la devuelve.
- 400: el `{id}` de la url no es un número.
- 404: no hay ninguna categoría con ese id.

---

### POST /categorias

Crea una nueva categoría.

Esta operación corresponde a la gestión de categorías realizada por el
dueño/administrador.

Se relaciona con HU-26.

Acá ya hace falta estar logueado, y con rol dueño.

- 201: se creó bien, devuelve la categoría con su id.
- 400: falta el `nombre` o está fuera de rango (menos de 2 o más de 100
  caracteres), o la `descripcion` es demasiado larga.
- 401: no mandaste el token o vino vencido/inválido.
- 403: estás logueado pero no sos el dueño (cliente o cajero, por ejemplo).
- 409: ya existe una categoría con ese mismo nombre.

---

### PATCH /categorias/{id}

Modifica una categoría existente.

Permite actualizar los datos de una categoría, como su nombre o descripción.

Se relaciona con HU-26.

Mismo caso que crear: solo dueño.

- 200: se modificó bien.
- 400: el `{id}` no es válido, el body viene vacío (tiene que traer al menos
  un campo), o `nombre`/`descripcion` no cumplen el largo permitido.
- 401: falta el token o es inválido.
- 403: no sos dueño.
- 404: no existe esa categoría.
- 409: el nombre nuevo ya lo está usando otra categoría.

---

## Relación con historias de usuario

| Ruta                     | Historia de usuario | Funcionalidad                         |
| ------------------------ | -------------------- | -------------------------------------- |
| GET `/categorias`        | HU-07                | Consultar categorías para el catálogo  |
| GET `/categorias/{id}`   | HU-07                | Consultar una categoría                |
| POST `/categorias`       | HU-26                | Crear categoría                        |
| PATCH `/categorias/{id}` | HU-26                | Editar categoría                       |

## Parámetros de ruta

La ruta:

`/categorias/{id}`

utiliza `{id}` para identificar una categoría específica. Es un entero
positivo (`IdParam` en `schemas/common.schema.js`).

## Permisos

La consulta de categorías forma parte del catálogo y podrá ser utilizada
por los clientes (de hecho ni hace falta estar logueado para los GET).

La creación y modificación de categorías corresponde al
dueño/administrador, esas rutas piden token y el rol tiene que ser dueño.

Los códigos de error de cada ruta quedaron detallados arriba, resumiendo:
400 es siempre tema de validación (datos mal formados), 401 es no tener
token, 403 es tener token pero no el rol que corresponde, 404 es que la
categoría no existe, y 409 es choque con el nombre único.
