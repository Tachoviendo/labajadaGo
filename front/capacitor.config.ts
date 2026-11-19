import type { CapacitorConfig } from '@capacitor/cli';

//app de Android con Capacitor: mete el build de Angular (dist/front/browser) adentro de
//una app nativa. el proyecto nativo esta en front/android y se abre con Android Studio.
//ver "App de Android" en el README
const config: CapacitorConfig = {
  appId: 'uy.labajada.app',
  appName: 'La Bajada GO',
  webDir: 'dist/front/browser',
  server: {
    //la app se sirve como http://localhost para poder llamar a la api local, que es http
    //(desde una pagina https el webview bloquea pedidos http). solo para desarrollo
    androidScheme: 'http',
    cleartext: true,
  },
};

export default config;
