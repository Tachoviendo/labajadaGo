import {
  ApplicationConfig,
  DEFAULT_CURRENCY_CODE,
  LOCALE_ID,
  provideBrowserGlobalErrorListeners,
  isDevMode,
} from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeEsUy from '@angular/common/locales/es-UY';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';
import { authInterceptor } from './services/auth.interceptor';
import { provideServiceWorker } from '@angular/service-worker';
import { environment } from '../environments/environment';

//español de Uruguay para los pipes de numeros y plata: "$ 1.167" en vez de "$1,167"
registerLocaleData(localeEsUy);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    { provide: LOCALE_ID, useValue: 'es-UY' },
    //moneda por defecto del pipe currency (igual en las paginas se pasa 'UYU')
    { provide: DEFAULT_CURRENCY_CODE, useValue: 'UYU' },
    provideHttpClient(withInterceptors([authInterceptor])),
    //withComponentInputBinding: los parametros de la ruta (ej :id_pedido) llegan a la pagina
    //como input() del componente, sin inyectar ActivatedRoute
    provideRouter(routes, withComponentInputBinding()),
    //PWA: el service worker cachea el front para abrirlo instalado y sin conexion.
    //solo en el build de produccion de la web (no en ng serve ni en la app de Android)
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode() && environment.pwa,
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
