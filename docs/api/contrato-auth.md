# Contrato de autenticación y roles

Cómo se comunican el front y la API para el login y los permisos. Los tipos
del front están en `front/src/app/models/auth.model.ts` y copian los
schemas de la API.

## Roles

`cliente`, `cajero` y `dueno` (sin ñ). Los clientes se crean con
`POST /auth/register`; cajeros y dueños los crea el dueño.

## Login

`POST /auth/login` con `{ email, password }`.

- 200: devuelve `{ usuario, token }`.
- 400: falta un campo o el email no es válido.
- 401: credenciales incorrectas o usuario inactivo.

`POST /auth/register` devuelve lo mismo (201).

## Token

- JWT que vence a las 8 horas. Adentro solo lleva `{ id, rol }`.
- Se manda en cada ruta protegida: `Authorization: Bearer <token>`. En el
  front lo agrega el interceptor.
- La API lo valida con `app.authenticate` (401 si falta o es inválido) y
  `app.authorize(...roles)` (403 si el rol no corresponde).

## Modelos

- Usuario: `id`, `nombre`, `email`, `telefono`, `rol`, `activo`,
  `fechaCreacion`.
- Error: `{ statusCode, code, message }`. El front muestra `message`.

## Permisos por rol

| Acción | Sin login | cliente | cajero | dueno |
|---|---|---|---|---|
| Ver productos y categorías | • | • | • | • |
| Ver y editar su perfil | | • | • | • |
| Carrito, direcciones, hacer y cancelar pedidos | | • | | |
| Ver todos los pedidos y cambiar su estado | | | • | • |
| Gestionar productos, categorías y usuarios | | | | • |

Después del login: `cliente` va a `/`, `cajero` a `/admin/pedidos` y
`dueno` a `/admin`.

## Contraseñas

- En la base solo se guarda el hash, nunca la contraseña.
- La API nunca devuelve la contraseña ni el hash: `UserSchema` no los
  incluye.
- El front no guarda la contraseña, solo el token y el usuario.