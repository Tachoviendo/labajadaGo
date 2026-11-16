
//url base de la api, la usan todos los services
export const environment = {
  apiUrl: 'http://localhost:3000/api',
  //centro por defecto de los mapas: el local, en la plaza Artigas de Salto
  //(mismas coordenadas que LOCAL_LAT/LOCAL_LNG del .env de la api)
  mapa: {
    centro: { lat: -31.38876, lng: -57.96062 },
    zoom: 15,
  },
};

