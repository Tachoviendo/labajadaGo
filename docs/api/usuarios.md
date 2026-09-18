# Recurso Usuarios

El recurso `/usuarios` representa las cuentas de los usuarios del sistema
Kiosco La Bajada.

Los usuarios pueden tener los siguientes roles:

- Cliente
- Cajero
- Dueño/Administrador

## Rutas

### POST /usuarios

Registra un nuevo usuario en el sistema.

Se utiliza principalmente para el registro de clientes (HU-01).

---

### GET /usuarios

Obtiene el listado de usuarios registrados.

Esta operación será utilizada principalmente para las funciones
administrativas relacionadas con la gestión de usuarios.

---

### GET /usuarios/{id}

Obtiene la información de un usuario específico mediante su identificador.

---

### PATCH /usuarios/{id}

Modifica los datos de un usuario existente.

Se relaciona principalmente con la edición de perfil (HU-04).

También podrá utilizarse para modificar información de usuarios internos
según los permisos definidos posteriormente.

---

### DELETE /usuarios/{id}

Desactiva o elimina lógicamente un usuario existente.

La operación se plantea como baja lógica para mantener la información
histórica asociada a pedidos y otras operaciones del sistema.

---

## Relación con historias de usuario

| Ruta                    | Historia de usuario | Funcionalidad                 |
| ----------------------- | ------------------- | ----------------------------- |
| POST `/usuarios`        | HU-01               | Registrar cliente             |
| GET `/usuarios`         | HU-05               | Gestión de usuarios internos  |
| GET `/usuarios/{id}`    | HU-04               | Consultar perfil              |
| PATCH `/usuarios/{id}`  | HU-04               | Editar perfil                 |
| DELETE `/usuarios/{id}` | HU-05               | Baja/desactivación de usuario |

## Autenticación

Las operaciones de autenticación se documentarán como rutas independientes:

- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/recuperar-password`

Estas operaciones corresponden a HU-02 y HU-03 y no forman parte
directamente del recurso `/usuarios`.

## Parámetros de ruta

Las rutas que trabajan sobre un usuario específico utilizan:

`{id}`

Este parámetro representa el identificador del usuario.

El detalle del tipo de dato y su schema se definirá en la siguiente etapa
de diseño de la API.

## Permisos

Los permisos de cada operación dependerán del rol del usuario:

- Cliente
- Cajero
- Dueño/Administrador

La definición detallada de autenticación, autorización y códigos HTTP
se documentará posteriormente.
