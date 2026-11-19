import { Pipe, PipeTransform } from '@angular/core';

import { environment } from '../../environments/environment';

const PREFIJO_BUCKET = '/bucket/';

//la api guarda las imagenes como /bucket/<archivo>. en la web esa ruta la atiende el proxy
//de ng serve; en la app de Android no hay proxy y hay que ir directo al bucket de la compu
//(environment.bucketUrl). urls absolutas o de assets propios (/imagenes/...) quedan igual
export function urlPublica(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith(PREFIJO_BUCKET)) {
    return `${environment.bucketUrl}/${url.slice(PREFIJO_BUCKET.length)}`;
  }
  return url;
}

//uso: <img [src]="producto.imagenUrl | urlPublica">
@Pipe({ name: 'urlPublica' })
export class UrlPublicaPipe implements PipeTransform {
  transform(url: string | null | undefined): string | null {
    return urlPublica(url);
  }
}
