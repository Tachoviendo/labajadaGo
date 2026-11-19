import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { Pedido } from './orders.service';

//flujo del repartidor (ver docs/seguimiento-delivery.md):
//disponibles -> recoger (pasa a en_reparto) -> mandar ubicacion -> entregar con foto.
//sus repartos asignados (el que esta llevando y los entregados) salen de OrdersService.listar()
//y la ubicacion en vivo se manda con SeguimientoService.conectar(...).enviarUbicacion()
@Injectable({ providedIn: 'root' })
export class RepartosService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  //pedidos en preparando y sin repartidor, del mas viejo al mas nuevo
  disponibles(): Observable<Pedido[]> {
    return this.http.get<Pedido[]>(`${this.apiUrl}/repartos/disponibles`);
  }

  //lo asigna al repartidor logueado y pasa a en_reparto.
  //409 si ya tiene otro pedido en reparto o si otro repartidor lo tomo antes
  recoger(idPedido: number): Observable<Pedido> {
    return this.http.post<Pedido>(`${this.apiUrl}/pedidos/${idPedido}/recoger`, {});
  }

  //multipart con la foto en el campo "file" (jpeg, png o webp, hasta 5 MB).
  //pasa a entregado y, si es POS, el pago queda cobrado
  entregar(idPedido: number, foto: Blob, nombreArchivo = 'entrega.jpg'): Observable<Pedido> {
    const formData = new FormData();
    formData.append('file', foto, nombreArchivo);
    return this.http.post<Pedido>(`${this.apiUrl}/pedidos/${idPedido}/entregar`, formData);
  }
}
