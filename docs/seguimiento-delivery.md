# Seguimiento del delivery

Cómo funciona el reparto con mapa y seguimiento en vivo, y qué ofrece la api para
armar el **front del repartidor**. El front del cliente (detalle de "Mis pedidos" con
el mapa) ya lo consume.

## Flujo

```
preparando ──(repartidor: "Recogí el pedido")──▶ en_reparto ──(repartidor: "Entregado" + foto)──▶ entregado
                                                      │
                                     manda su ubicación cada ~5 s por websocket
                                     el cliente la ve en vivo en el mapa
```

- El repartidor ve los pedidos **listos** (`preparando` y sin repartidor) y toma uno con
  "Recogí el pedido". Ahí queda asignado, pasa a `en_reparto` y empieza el seguimiento.
- Mientras está en reparto manda su ubicación. Cada punto se guarda (historial del
  recorrido) y le llega en vivo al cliente.
- Para cerrar sube una **foto del cliente con el pedido**: el pedido pasa a `entregado` y,
  si se paga con POS, el pago queda registrado como cobrado por el repartidor.
- **Un reparto a la vez**: con un pedido en reparto no puede recoger otro.
- Cajero y dueño ya no pueden pasar un pedido a `en_reparto` ni a `entregado` a mano.
  Sí pueden volver un `en_reparto` a `preparando` (por error): se libera el repartidor.

## Usuario de prueba

| Rol | Email | Contraseña |
|---|---|---|
| Repartidor | `pedro@labajada.com` | `repartidor123` |

En el seed, Pedro tiene el pedido **4** en reparto (de Juan) y el **2** entregado. El pedido
**1** está disponible para recoger (pero Pedro primero tiene que entregar el 4).
El dueño puede crear más repartidores en `POST /api/usuarios` con `rol: "repartidor"`.

## Front: lo que hay que tener en cuenta

- **Rol nuevo**: la api devuelve `rol: "repartidor"` en el login. En el front hay que
  sumarlo al tipo `Rol` de `src/app/models/auth.model.ts`, a los guards y al menú
  (hoy `app.html` muestra el menú de cliente o el de personal).
- **Todo va por rutas relativas**: `environment.apiUrl` es `/api` y las imágenes vienen
  como `/bucket/<archivo>`. En desarrollo lo atiende el proxy de `ng serve`
  (`front/proxy.conf.json`).
- **Celular real**: la ubicación del navegador (`navigator.geolocation`) solo funciona en
  HTTPS. Correr `npm run start:movil` y abrir `https://<ip-de-la-compu>:4200` desde el
  celular (ver "Probar desde el celular" en el README).
- **Foto**: el máximo es 5 MB. Las fotos del celular suelen pesar más, así que conviene
  achicarlas antes de subir (por ejemplo dibujarlas en un `<canvas>` a ~1600 px de lado y
  exportar JPEG con `canvas.toBlob(..., 'image/jpeg', 0.8)`). Para abrir la cámara o la
  galería alcanza con `<input type="file" accept="image/*">` (con `capture="environment"`
  abre directo la cámara trasera).
- **Mapa**: OpenLayers (`ol`) ya está instalado. `src/app/components/mapa-seguimiento/`
  dibuja local, destino, recorrido y la posición en vivo; el mismo componente sirve para
  la pantalla del repartidor. `src/app/services/seguimiento.service.ts` trae el recorrido
  y maneja el websocket.

## Endpoints

Todos piden `Authorization: Bearer <token>`. Los errores vienen como
`{ statusCode, code, message }`, con `message` en español listo para mostrar.

### `GET /api/repartos/disponibles`

Pedidos listos para recoger (`preparando` y sin repartidor), los más viejos primero.
Solo rol `repartidor`. Devuelve un array de pedidos (formato abajo).

### `GET /api/pedidos`

Con rol `repartidor` lista **sus** repartos (en curso y entregados). Acepta los filtros
de siempre (`estado`, `page`, `limit`, `sort`).

### `GET /api/pedidos/:id`

El repartidor puede ver sus pedidos y los disponibles. Otro pedido: 403.

### `POST /api/pedidos/:id/recoger`

"Recogí el pedido". Sin body. Devuelve el pedido con `estado: "en_reparto"` y
`repartidorId` con el id del repartidor.

| Código | Cuándo |
|---|---|
| 404 | el pedido no existe |
| 409 | no está en `preparando`, ya lo tiene otro repartidor, o el repartidor ya tiene otro pedido en reparto |

### `POST /api/pedidos/:id/entregar`

"Entregado". `multipart/form-data` con la foto en el campo **`file`** (jpeg, png o webp,
hasta 5 MB). Devuelve el pedido con `estado: "entregado"` y `fotoEntregaUrl`.

```ts
const form = new FormData();
form.append('file', foto, 'entrega.jpg');
this.http.post<Pedido>(`${environment.apiUrl}/pedidos/${id}/entregar`, form);
```

| Código | Cuándo |
|---|---|
| 400 | no vino la foto, el tipo no es jpeg/png/webp, o el archivo no es una imagen de verdad |
| 403 | el pedido no está asignado a ese repartidor |
| 404 | el pedido no existe |
| 409 | el pedido no está `en_reparto` |
| 413 | la foto supera los 5 MB |
| 502 | el bucket de imágenes no respondió |

### `GET /api/pedidos/:id/recorrido`

Lo necesario para dibujar el mapa al abrirlo. Solo el cliente del pedido y su repartidor.

```json
{
  "pedidoId": 4,
  "estado": "en_reparto",
  "origen":  { "lat": -31.38876, "lng": -57.96062 },
  "destino": { "lat": -31.3801,  "lng": -57.9655 },
  "puntos": [
    { "lat": -31.38876, "lng": -57.96062, "fecha": "2026-11-13T10:00:00.000Z" },
    { "lat": -31.387,   "lng": -57.9621,  "fecha": "2026-11-13T10:04:00.000Z" }
  ]
}
```

`origen` es el local (`LOCAL_LAT`/`LOCAL_LNG` del `.env`), `destino` el punto que marcó
el cliente en su dirección y `puntos` el recorrido en orden.

### Formato del pedido

Los campos nuevos para el reparto son `repartidorId` y `fotoEntregaUrl`. La dirección trae
`lat`/`lng`.

```json
{
  "id": 4,
  "usuarioId": 3,
  "direccion": {
    "id": 3, "usuarioId": 3, "calle": "Rivera", "numero": "89", "ciudad": "Salto",
    "referencia": null, "lat": -31.3801, "lng": -57.9655, "esPredeterminada": false
  },
  "items": [
    { "id": 8, "productoId": 21, "nombreProducto": "Galletitas Oreo", "cantidad": 2,
      "precioUnitario": 75, "subtotal": 150 }
  ],
  "estado": "en_reparto",
  "metodoPago": "mercadopago",
  "total": 202,
  "fechaCreacion": "2026-11-10T10:00:00.000Z",
  "repartidorId": 5,
  "fotoEntregaUrl": null
}
```

## Websocket: `/api/pedidos/:id/seguimiento`

Una conexión por pedido. Entran **solo** el cliente del pedido y su repartidor.

```ts
//ws en http, wss en https (celular). pasa por el proxy de ng serve
const protocolo = location.protocol === 'https:' ? 'wss' : 'ws';
const ws = new WebSocket(`${protocolo}://${location.host}/api/pedidos/${id}/seguimiento`);
```

1. Al abrir, el **primer mensaje** tiene que ser el login (el navegador no deja mandar
   headers en un websocket). Hay 5 segundos para mandarlo:
   ```json
   { "tipo": "auth", "token": "<jwt>" }
   ```
2. El servidor contesta:
   ```json
   { "tipo": "listo", "pedidoId": 4, "estado": "en_reparto", "rol": "repartidor" }
   ```
3. El repartidor manda su posición (sugerido: cada ~5 s o cuando se movió más de ~20 m):
   ```json
   { "tipo": "ubicacion", "lat": -31.3835, "lng": -57.9642 }
   ```
   Se guarda y les llega a todos los conectados al pedido (también al repartidor):
   ```json
   { "tipo": "ubicacion", "pedidoId": 4, "lat": -31.3835, "lng": -57.9642, "fecha": "2026-11-16T05:41:57.899Z" }
   ```
   Si manda puntos con menos de 2 s de diferencia, los de más se ignoran sin aviso.
4. Cuando el pedido cambia de estado (recoger, entregar, o el personal lo vuelve a
   preparación) llega:
   ```json
   { "tipo": "estado", "pedidoId": 4, "estado": "entregado", "repartidorId": 5, "fotoEntregaUrl": "/bucket/....jpg" }
   ```
   Después de `entregado` el servidor ya no acepta ubicaciones de ese pedido: conviene
   cortar el `watchPosition` y cerrar el websocket.

Errores que no cortan la conexión (llegan como `{ "tipo": "error", "mensaje": "..." }`):
JSON inválido, tipo desconocido, `lat`/`lng` fuera de rango, el cliente intentando mandar
ubicación, o el pedido que ya no está en reparto.

Códigos de cierre:

| Código | Motivo |
|---|---|
| 4401 | no llegó el login a tiempo, el primer mensaje no fue `auth`, o el token es inválido |
| 4403 | ese usuario no es el cliente del pedido ni su repartidor |
| 4404 | el pedido no existe |
| 4500 | error interno |

Si la conexión se corta por la red (por ejemplo el celular pierde señal), hay que
reconectar y volver a mandar el `auth`. Los puntos que se pierdan en el medio no se
recuperan; al reconectar conviene pedir de nuevo `GET /recorrido`.
