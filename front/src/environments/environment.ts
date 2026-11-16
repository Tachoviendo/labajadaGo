
//url base de la api, la usan todos los services. es relativa: en desarrollo la atiende
//el proxy de ng serve (proxy.conf.json), asi funciona igual en http://localhost:4200
//y en https://<ip-de-la-compu>:4200 desde el celular (la geolocalizacion pide https)
export const environment = {
  apiUrl: '/api',
  //centro por defecto de los mapas: el local, en la plaza Artigas de Salto
  //(mismas coordenadas que LOCAL_LAT/LOCAL_LNG del .env de la api)
  mapa: {
    centro: { lat: -31.38876, lng: -57.96062 },
    zoom: 15,
  },
};

