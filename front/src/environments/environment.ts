
//url base de la api, la usan todos los services. es relativa: en desarrollo la atiende
//el proxy de ng serve (proxy.conf.json), asi funciona igual en http://localhost:4200
//y en https://<ip-de-la-compu>:4200 desde el celular (la geolocalizacion pide https).
//la app de Android usa environment.android.ts (ver angular.json)
export const environment = {
  apiUrl: '/api',
  //base de las imagenes del bucket. la api las guarda como /bucket/<archivo>
  //(ver pipes/url-publica.pipe.ts)
  bucketUrl: '/bucket',
  //registra el service worker de la PWA (solo en el build de produccion)
  pwa: true,
  //centro por defecto de los mapas: el local, en la plaza Artigas de Salto
  //(mismas coordenadas que LOCAL_LAT/LOCAL_LNG del .env de la api)
  mapa: {
    centro: { lat: -31.38876, lng: -57.96062 },
    zoom: 15,
  },
};

