import { ApplicationConfig, provideBrowserGlobalErrorListeners, isDevMode } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { routes } from './app.routes';
import { authInterceptor } from './services/auth.interceptor';
import { provideServiceWorker } from '@angular/service-worker';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideRouter(routes),
    provideIonicAngular(),
    //PWA: el service worker cachea el front para abrirlo instalado y sin conexion.
    //solo en el build de produccion de la web (no en ng serve ni en la app de Android)
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode() && environment.pwa,
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
