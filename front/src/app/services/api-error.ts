import { HttpErrorResponse } from '@angular/common/http';

//saca un mensaje legible del error que tira firstValueFrom
//api respondio: viene en error.error.message (ApiError). api caida: status 0
export function mensajeDeError(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return 'No se pudo conectar con la API.';
    }
    return error.error?.message ?? error.message;
  }
  return 'Ocurrió un error inesperado.';
}