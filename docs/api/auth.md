# Recurso Auth

El recurso `/auth` agrupa registro y login/logout. No es una entidad en sí,
labura sobre `Usuario` (ver `docs/modelo-logico.md`) y devuelve un JWT que
después hay que mandar como `Authorization: Bearer <token>` en el resto de
las rutas protegidas.

## Rutas

### POST /auth/register

Registra un cliente nuevo. Ojo: esta ruta solo crea usuarios con rol
`cliente`, los roles internos (cajero, dueño) no se crean por acá.

Se relaciona con HU-01.

Es pública.

- 201: usuario creado, devuelve el usuario y el token para usar de una.
- 400: `nombre` fuera de rango, `email` mal formado, `password` con menos
  de 8 caracteres.
- 409: ya hay una cuenta registrada con ese email.

---

### POST /auth/login

Login para cualquier rol (cliente, cajero o dueño).

Se relaciona con HU-02.

Pública también, obvio.

- 200: credenciales bien, devuelve usuario + token.
- 400: falta `email` o `password` en el body, o el email no tiene formato
  válido.
- 401: el email no existe, la password está mal, o el usuario está
  desactivado (`activo: false`).

---

### POST /auth/logout

Cierra la sesión del usuario logueado.

Se relaciona con HU-02.

Necesita token. Cualquier rol logueado puede usarla.

- 204: listo, sesión cerrada, no devuelve nada.
- 401: no mandaste el token o está vencido/inválido.

---

## Relación con historias de usuario

- POST `/auth/register` → HU-01, registro de cliente.
- POST `/auth/login` → HU-02, inicio de sesión.
- POST `/auth/logout` → HU-02, cierre de sesión.

## Permisos

Register y login son públicos, no piden nada. Logout pide estar logueado
pero sirve para cualquier rol, ya que cierra tu propia sesión.

## Pendiente

HU-03 (recuperar contraseña) todavía no tiene ruta hecha en
`src/routes/auth.routes.js`. Falta documentar cuando se agregue.
