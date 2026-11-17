//environment de la app de Android (npm run build:android). reemplaza a environment.ts
//(fileReplacements de la configuracion "android" en angular.json).
//
//adentro de la app no hay proxy de ng serve: la api y el bucket se llaman con la direccion
//de la compu donde corren.
//  - emulador de Android Studio: 10.0.2.2 es la compu (localhost del emulador es el emulador)
//  - celular real por Wi-Fi o USB: poner la IP de la compu en la red (ipconfig), por
//    ejemplo http://192.168.1.9, y volver a correr npm run build:android
const servidor = 'http://10.0.2.2';

export const environment = {
  apiUrl: `${servidor}:3000/api`,
  bucketUrl: `${servidor}:3001`,
  //la app de Android no usa el service worker de la PWA
  pwa: false,
  mapa: {
    centro: { lat: -31.38876, lng: -57.96062 },
    zoom: 15,
  },
};
