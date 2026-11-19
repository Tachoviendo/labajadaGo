//sirve el build de produccion (dist/front/browser) para probar la PWA: el service worker
//no funciona con ng serve. hace lo mismo que el proxy de ng serve (proxy.conf.json):
//  /api    -> api en localhost:3000 (incluido el websocket del seguimiento)
//  /bucket -> bucket de imagenes en localhost:3001
//cualquier otra ruta sin archivo devuelve index.html (rutas de Angular).
//uso: npm run pwa  ->  http://localhost:4300
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PUERTO = Number(process.env.PWA_PORT || 4300);
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist/front/browser');
const DESTINOS = [
  { prefijo: '/api', puerto: 3000, quitarPrefijo: false },
  { prefijo: '/bucket', puerto: 3001, quitarPrefijo: true },
];
const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
};

if (!fs.existsSync(path.join(RAIZ, 'index.html'))) {
  console.error('No hay build en dist/front/browser. Correr primero: ng build');
  process.exit(1);
}

function destinoDe(url) {
  return DESTINOS.find((d) => url === d.prefijo || url.startsWith(`${d.prefijo}/`));
}

function rutaDestino(url, destino) {
  return destino.quitarPrefijo ? url.slice(destino.prefijo.length) || '/' : url;
}

const servidor = http.createServer((req, res) => {
  const destino = destinoDe(req.url);
  if (destino) {
    const proxy = http.request(
      { host: 'localhost', port: destino.puerto, method: req.method, path: rutaDestino(req.url, destino), headers: req.headers },
      (respuesta) => {
        res.writeHead(respuesta.statusCode, respuesta.headers);
        respuesta.pipe(res);
      },
    );
    proxy.on('error', () => {
      res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' });
      res.end(`No responde el servicio en el puerto ${destino.puerto}`);
    });
    req.pipe(proxy);
    return;
  }

  //archivos del build; si no existe, index.html (navegacion de Angular)
  const pedido = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let archivo = path.normalize(path.join(RAIZ, pedido));
  if (!archivo.startsWith(RAIZ) || !fs.existsSync(archivo) || fs.statSync(archivo).isDirectory()) {
    archivo = path.join(RAIZ, 'index.html');
  }
  const extension = path.extname(archivo);
  res.writeHead(200, {
    'content-type': TIPOS[extension] || 'application/octet-stream',
    //el service worker y su indice siempre frescos, para que detecte versiones nuevas
    'cache-control': /ngsw|index\.html/.test(archivo) ? 'no-cache' : 'public, max-age=3600',
  });
  fs.createReadStream(archivo).pipe(res);
});

//websocket del seguimiento: se reenvia la conexion tal cual a la api
servidor.on('upgrade', (req, socket, cabeza) => {
  const destino = destinoDe(req.url);
  if (!destino) return socket.destroy();
  const proxy = http.request({ host: 'localhost', port: destino.puerto, path: rutaDestino(req.url, destino), headers: req.headers });
  proxy.on('upgrade', (respuesta, socketApi, cabezaApi) => {
    const lineas = [`HTTP/1.1 101 Switching Protocols`];
    for (let i = 0; i < respuesta.rawHeaders.length; i += 2) lineas.push(`${respuesta.rawHeaders[i]}: ${respuesta.rawHeaders[i + 1]}`);
    socket.write(lineas.join('\r\n') + '\r\n\r\n');
    if (cabezaApi?.length) socket.write(cabezaApi);
    if (cabeza?.length) socketApi.write(cabeza);
    socketApi.pipe(socket).pipe(socketApi);
    socket.on('error', () => socketApi.destroy());
    socketApi.on('error', () => socket.destroy());
  });
  proxy.on('error', () => socket.destroy());
  proxy.end();
});

servidor.listen(PUERTO, () => {
  console.log(`PWA en http://localhost:${PUERTO} (build de produccion, con service worker)`);
});
