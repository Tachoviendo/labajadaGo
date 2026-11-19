//ng-bootstrap usa $localize en sus textos (ej: el aria-label de cerrar una alerta); sin esto rompe en runtime
import '@angular/localize/init';

import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
