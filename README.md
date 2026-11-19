# labajadaGo
Proyecto de dw2026

## Estructura del repo

```
/api      backend (Fastify): src, schemas, errors, plugins, services, package.json
/front    frontend (Angular)
/db       scripts de la base: 01_schema.sql, 02_triggers.sql y 03_seed.sql
/docs     documentación (historias de usuario, modelo, API, mapa de navegación)
/deploy   nginx del servidor de producción
docker-compose.dev.yaml   desarrollo: levanta Postgres (carga /db) y el bucket
docker-compose.yml        producción: levanta todo (base, api, bucket y front)
.env.example              variables compartidas por docker-compose y la api
```

## Cómo levantar el proyecto

1. Copiar `.env.example` a `.env` en la raíz del repo.
2. Levantar la base y el bucket: `docker compose -f docker-compose.dev.yaml up -d` (desde
   la raíz). La primera vez que se crea el volumen corre los scripts de `db/` en orden
   (`01_schema.sql`, `02_triggers.sql` y `03_seed.sql`). Para recargarlos:
   `docker compose -f docker-compose.dev.yaml down -v` y volver a levantar.
   (Ojo: `docker compose up` sin `-f` usa `docker-compose.yml`, que es el de producción.)
3. Levantar la api:
   ```
   cd api
   npm install
   npm run dev
   ```
   Queda en `http://localhost:3000/api` y la doc en `http://localhost:3000/docs`.

   4. Levantar el front (en otra terminal):
```
   cd front
   npm install
   npm start
```
   Queda en `http://localhost:4200`. `ng serve` tiene un proxy (`front/proxy.conf.json`):
   `/api` (incluido el websocket del seguimiento) va a la api en el puerto 3000 y `/bucket`
   va al bucket de imágenes en el 3001. Por eso el front usa rutas relativas.

## Probar desde el celular (HTTPS)

El mapa del repartidor usa la ubicación del navegador, y el celular solo la da en HTTPS.

1. Conectar la compu y el celular al mismo Wi-Fi.
2. Con la base, el bucket y la api levantados, correr el front así:
   ```
   cd front
   npm run start:movil
   ```
   Levanta `ng serve` con un certificado autofirmado y escuchando en toda la red local.
   La primera vez Windows pregunta si permite Node.js en redes privadas: aceptar.
3. Averiguar la IP de la compu en el Wi-Fi (`ipconfig`, "Dirección IPv4", por ejemplo
   `192.168.1.20`) y abrir en el celular `https://192.168.1.20:4200`.
4. El navegador avisa que el certificado no es de confianza: entrar igual (en Chrome,
   "Configuración avanzada" → "Acceder al sitio"). Pasa una vez por dispositivo.

La api y el bucket no se exponen: el celular solo habla con el puerto 4200 y el proxy
reenvía todo dentro de la compu.

## App de Android (Android Studio)

El front se empaqueta como app de Android con [Capacitor](https://capacitorjs.com).
El proyecto nativo está en `front/android`. Hace falta Android Studio (trae el SDK, el
emulador y el Java que usa Gradle). El wrapper usa Gradle 9.1 porque el Java que trae
Android Studio es el 25 y Gradle 8 no lo soporta.

1. Con la base, el bucket y la api levantados, generar la app:
   ```
   cd front
   npm run build:android
   ```
   Hace el build de Angular para Android y lo copia al proyecto nativo (`cap sync`).
   Hay que volver a correrlo cada vez que cambia el front.
2. Abrir el proyecto en Android Studio: `npm run android` (o abrir la carpeta
   `front/android`). La primera vez Gradle descarga dependencias y tarda un rato.
3. Elegir el emulador o el celular y tocar **Run**.

**A qué api se conecta la app.** Adentro de la app no hay proxy de `ng serve`: la
dirección de la compu está en `front/src/environments/environment.android.ts`.

- Emulador: `http://10.0.2.2` (así ve el emulador a la compu). Es el valor por defecto.
- Celular real (por Wi-Fi o USB): poner la IP de la compu en la red (`ipconfig`, por
  ejemplo `http://192.168.1.9`) y volver a correr `npm run build:android`. La primera
  vez Windows pregunta si deja entrar conexiones a Node.js y a Docker: aceptar en redes
  privadas.

**App contra producción.** `npm run build:android:prod` hace lo mismo que
`build:android` pero con `environment.android.prod.ts`, que apunta a
`https://labajadago.graph.uy` (no hace falta levantar nada en la compu). Después se
abre y se corre igual, desde Android Studio.

La app se sirve como `http://localhost`, así que ese origen tiene que estar en
`CORS_ORIGIN` del `.env` (ya viene en `.env.example`). La ubicación usa el plugin nativo
(`@capacitor/geolocation`): la app pide el permiso de Android y no necesita HTTPS.

**Celular por USB:** activar "Opciones de desarrollador" y "Depuración por USB" en el
celular, conectarlo y aceptar el aviso; aparece en la lista de dispositivos de Android
Studio.

## Idea del proyecto

**Kiosco La Bajada** Busca realizar pedidos online pero como en bella unión no está pedidos ya el proyecto busca generar una webde **pedidos online**, que permita a los clientes comprar sin tener que ir presencialmente o llamar por teléfono, y que le dé al kiosco
una herramienta simple para gestionar esos pedidos de punta a punta.

### Objetivo

Construir un sistema donde:

- Los **clientes** puedan registrarse, navegar el catálogo de productos, armar un carrito de
  compras, confirmar un pedido, pagarlo (online con MercadoPago o en persona con POS al recibirlo)
  y hacer seguimiento del estado de su pedido en tiempo real.
- El **dueño del kiosco** pueda administrar el catálogo (alta, baja y modificación de productos)
  y tenga visibilidad completa sobre los pedidos.
- El **cajero/empleado** pueda operar el día a día: ver los pedidos entrantes y actualizar el
  estado de cada uno a medida que se van preparando y entregando, con un nivel de acceso más
  acotado que el del dueño.

## Usuarios de prueba

Se cargan con `db/03_seed.sql`. Son solo para desarrollo.

| Rol | Email | Contraseña |
|---|---|---|
| Dueño | `marcos@labajada.com` | `admin123` |
| Cajero | `lucia@labajada.com` | `cajera123` |
| Cliente | `juan@gmail.com` | `juan123` |
| Cliente | `ana@gmail.com` | `ana123` |
| Repartidor | `pedro@labajada.com` | `repartidor123` |

## Cómo probar la autenticación

**Desde Swagger** (`http://localhost:3000/docs`):

1. `POST /auth/login` con el email y la contraseña de un usuario de prueba.
2. Copiar el `token` de la respuesta, tocar **Authorize** y pegarlo.
3. Probar rutas protegidas. Por ejemplo `GET /usuarios`: con el dueño da 200,
   con un cliente da 403 y sin token da 401.

**Desde el front** (`http://localhost:4200`):

1. Entrar a `/login` con un usuario de prueba.
2. Según el rol, se redirige a `/productos` (cliente), `/admin/pedidos` (cajero) o
   `/admin` (dueño).
3. Las páginas de otro rol no se pueden abrir (las bloquean los guards).

El contrato completo (token, roles y permisos) está en
[docs/api/contrato-auth.md](./docs/api/contrato-auth.md).

### Roles del sistema

| Rol | Descripción |
|---|---|
| **Cliente** | Usuario final que compra productos a través de la web. |
| **Cajero / Empleado** | Usuario interno con acceso limitado a la gestión operativa de pedidos. |
| **Dueño / Administrador** | Usuario interno con acceso total: gestión de productos, usuarios y pedidos. |

### Flujo de un pedido

Cada pedido, una vez confirmado, atraviesa un ciclo de estados que tanto el cliente como el
personal del kiosco pueden visualizar:

1. **Pedido realizado**
2. **Preparando tu pedido**
3. **Pedido en reparto**
4. **Pedido entregado**

El personal del kiosco puede avanzar o retroceder el pedido entre estas etapas, y el cliente
puede seguir el progreso desde su cuenta.

### Medios de pago

- **MercadoPago**: pago online al momento de confirmar el pedido.
- **POS al recibir**: pago en el momento de la entrega, con posnet físico en la puerta.


### Historias de Usuario
en el siguiente archivo listamos las épicas y las historias de usuario: [userStories.md](./docs/userStories.md).

### Modelo de datos

- **Modelo lógico**: entidades, atributos y relaciones en [modelo-logico.md](./docs/modelo-logico.md).
- **Modelo físico y scripts**: en la carpeta [db](./db):
  - [01_schema.sql](./db/01_schema.sql): script que crea la base de datos.
  - [02_triggers.sql](./db/02_triggers.sql): triggers que descuentan y reponen el stock.
  - [03_seed.sql](./db/03_seed.sql): script con datos de prueba.

### Documentación de la API

Documentación por recurso de cada ruta (autenticación, roles y códigos de
respuesta): [docs/api](./docs/api/README.md).

### Mapa de navegación

Páginas del front, sus rutas y cómo se conectan según el rol:

- [Ver en Google Drive](https://drive.google.com/file/d/1QAfjA_V0KMEgS-NTQ5ihrXJliVpGKGnq/view?usp=sharing)
- [Archivo draw.io en el repo](./docs/mapa-navegacion.drawio)

### El orden en las epicas que buscaremos seguir
1. Registro/login de clientes y roles (HU-01, HU-02, HU-05).
2. Catálogo de productos y su administración (HU-06, HU-08, HU-09).
3. Carrito de compras y checkout (HU-11, HU-12, HU-14).
4. Pago con MercadoPago y POS al recibir (HU-15, HU-16, HU-17).
5. Estados del pedido y seguimiento (HU-18, HU-20, HU-21, HU-22).
6. Resto de historias (búsqueda, historial, notificaciones, panel, cancelación) como
   incrementales sobre el MVP.

## Producción (labajadago.graph.uy)

Corre con `docker-compose.yml` en el droplet compartido (Antezana247), en `/var/www/labajadaGo`.
Hacia afuera solo se publica el front en el puerto 8080. El nginx de ese contenedor
(`front/nginx.conf`) sirve el build de Angular y manda `/api` (con el websocket incluido) y
`/bucket` a sus contenedores. Postgres queda en `127.0.0.1:8081`.

Cada push a `main` se despliega solo con `.github/workflows/deploy.yml`, que corre en el
runner del repo (labels `self-hosted,labajadago`): hace `git pull`, `build`, `up -d` y chequea
`/api/health`.

Para probarlo en la compu (con otro nombre y otro puerto, así no choca con la base de
desarrollo): un `.env` aparte con las variables del bloque "Producción" de `.env.example` y
`docker compose -p labajadago-prueba --env-file <ese .env> up -d --build`.
