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

---

### GET /categorias/{id}

Obtiene una categoría específica mediante su identificador.

---

### POST /categorias

Crea una nueva categoría.

Esta operación corresponde a la gestión de categorías realizada por el
dueño/administrador.

Se relaciona con HU-26.

---

### PATCH /categorias/{id}

Modifica una categoría existente.

Permite actualizar los datos de una categoría, como su nombre o descripción.

Se relaciona con HU-26.

---

## Relación con historias de usuario

| Ruta                     | Historia de usuario | Funcionalidad                         |
| ------------------------ | ------------------- | ------------------------------------- |
| GET `/categorias`        | HU-07               | Consultar categorías para el catálogo |
| GET `/categorias/{id}`   | HU-07               | Consultar una categoría               |
| POST `/categorias`       | HU-26               | Crear categoría                       |
| PATCH `/categorias/{id}` | HU-26               | Editar categoría                      |

## Parámetros de ruta

La ruta:

`/categorias/{id}`

utiliza `{id}` para identificar una categoría específica.

El tipo de dato y el schema correspondiente se definirán posteriormente.

## Permisos

La consulta de categorías forma parte del catálogo y podrá ser utilizada
por los clientes.

La creación y modificación de categorías corresponde al
dueño/administrador.

La definición detallada de autenticación, autorización y códigos HTTP
se realizará posteriormente.
