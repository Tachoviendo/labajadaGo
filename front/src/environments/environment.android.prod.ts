//environment de la app de Android contra produccion (npm run build:android:prod).
//reemplaza a environment.ts (configuracion "android-prod" de angular.json).
//
//igual que environment.android.ts pero apunta al servidor en vez de a la compu. la app se
//sirve como http://localhost, por eso ese origen esta en CORS_ORIGIN del .env del servidor
const servidor = 'https://labajadago.graph.uy';

export const environment = {
  apiUrl: `${servidor}/api`,
  //la api guarda las imagenes como /bucket/<archivo> (ver pipes/url-publica.pipe.ts)
  bucketUrl: `${servidor}/bucket`,
  //la app de Android no usa el service worker de la PWA
  pwa: false,
  mapa: {
    centro: { lat: -31.38876, lng: -57.96062 },
    zoom: 15,
  },
};
