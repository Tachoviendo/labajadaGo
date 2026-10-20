# Documentación de la API — Kiosco La Bajada

Acá está la doc de cada recurso, sacada de las rutas en
`api/src/routes/*.routes.js`. Por cada ruta se cuenta: qué hace, si necesita
login, qué rol puede usarla, y todos los códigos que puede devolver.

Algunas cosas que se repiten en casi todas las rutas y no vale la pena
repetir en cada archivo:

- si la ruta pide login, va `Authorization: Bearer <token>`. Si falta o
  está vencido/inválido, siempre es 401.
- si el token es válido pero el rol no corresponde, es 403.
- 400 es error de validación (algo del body/params/query no cumple el
  schema: falta un campo, un valor fuera de rango, un enum que no
  corresponde).
- 404 es que el recurso del `{id}` (o alguna referencia del body, tipo
  `categoriaId` o `direccionId`) no existe.
- 409 es conflicto: algo único que se repite (nombre de categoría, email),
  stock insuficiente, o un cambio de estado de pedido/pago que no tiene
  sentido.
- 500 puede pasar siempre por algún error no contemplado, pero no lo
  repetimos en cada ruta (está mapeado en `api/errors/response.errors.js`).

## Recursos

- [auth.md](./auth.md) — `/auth/register`, `/auth/login`, `/auth/logout`
- [usuarios.md](./usuarios.md) — `/usuarios`
- [direcciones.md](./direcciones.md) — `/direcciones`
- [categorias.md](./categorias.md) — `/categorias`
- [productos.md](./productos.md) — `/productos`
- [carrito.md](./carrito.md) — `/carrito`
- [pedidos.md](./pedidos.md) — `/pedidos`
- [pagos.md](./pagos.md) — `/pagos`

## Roles

`cliente`, `cajero`, `dueno` (ver `api/schemas/enums.schema.js`). Quién puede
usar cada ruta está en la sección de permisos de cada archivo.

## Cosas que quedaron pendientes mientras documentaba

- Falta una ruta `POST /usuarios` para que el dueño cree cuentas internas
  (cajero/dueño). El schema `CreateInternalUserBody` ya existe pero no se
  usa en ninguna ruta (HU-05). Ver [usuarios.md](./usuarios.md).
- HU-03 (recuperar contraseña) no tiene ruta todavía. Ver
  [auth.md](./auth.md).
- Varias rutas todavía tienen handlers stub. Los hooks de autenticación y
  rol, y los controles de propiedad implementados, se aplican en el backend;
  la documentación describe el contrato esperado, pero no todas las
  operaciones tienen persistencia implementada.
