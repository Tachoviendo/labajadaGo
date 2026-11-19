import { Component, DestroyRef, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { NgbAlert } from '@ng-bootstrap/ng-bootstrap';
import { firstValueFrom } from 'rxjs';

import { Producto } from '../../../../models/product.model';
import { ProductsService } from '../../../../services/products.service';
import { mensajeDeError } from '../../../../services/api-error';
import { urlPublica } from '../../../../pipes/url-publica.pipe';

const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 2 * 1024 * 1024;
const PLACEHOLDER = '/imagenes/imagendeproductos.png';

//por ahora la pagina solo maneja la imagen del producto (:id).
//el formulario de alta y edicion de datos queda pendiente
@Component({
  selector: 'app-alta-edicion-producto',
  imports: [RouterLink, NgbAlert],
  templateUrl: './alta-edicion-producto.page.html',
  styleUrl: './alta-edicion-producto.page.css',
})
export class AltaEdicionProductoPage {
  private readonly productsService = inject(ProductsService);
  private readonly destroyRef = inject(DestroyRef);

  //:id de la ruta (withComponentInputBinding). en /admin/productos/nuevo no viene
  readonly id = input<string | undefined>(undefined);

  readonly esNuevo = computed(() => !this.id());
  readonly idNumerico = computed(() => Number(this.id()));
  readonly idValido = computed(
    () => Number.isInteger(this.idNumerico()) && this.idNumerico() > 0,
  );

  readonly productoResource = rxResource({
    params: () => (this.idValido() ? this.idNumerico() : undefined),
    stream: ({ params: id }) => this.productsService.obtener(id),
  });

  //copia editable: despues de subir la imagen se reemplaza por el producto actualizado
  //(value() tira error si el resource fallo, por eso se chequea hasValue antes)
  readonly producto = linkedSignal<Producto | null>(() =>
    this.productoResource.hasValue() ? this.productoResource.value() : null,
  );
  readonly cargando = computed(() => this.productoResource.isLoading());
  readonly errorCarga = computed(() => {
    if (!this.esNuevo() && !this.idValido()) return 'El identificador del producto no es válido.';
    const error = this.productoResource.error();
    return error ? mensajeDeError(error) : '';
  });
  readonly subiendo = signal(false);
  readonly archivo = signal<File | null>(null);
  readonly error = signal('');
  readonly mensaje = signal('');

  //vista previa local del archivo elegido, o la imagen actual del producto
  private readonly previewLocal = computed(() => {
    const archivo = this.archivo();
    return archivo ? URL.createObjectURL(archivo) : null;
  });
  readonly imagenUrl = computed(
    () => this.previewLocal() ?? urlPublica(this.producto()?.imagenUrl) ?? PLACEHOLDER,
  );

  constructor() {
    this.destroyRef.onDestroy(() => this.liberarPreview());
  }

  elegirArchivo(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0] ?? null;
    this.error.set('');
    this.mensaje.set('');
    this.liberarPreview();

    if (archivo && !TIPOS_PERMITIDOS.includes(archivo.type)) {
      this.error.set('Solo se aceptan imágenes JPG, PNG o WEBP.');
      this.archivo.set(null);
      input.value = '';
      return;
    }
    if (archivo && archivo.size > MAX_BYTES) {
      this.error.set('La imagen no puede pesar más de 2 MB.');
      this.archivo.set(null);
      input.value = '';
      return;
    }

    this.archivo.set(archivo);
  }

  async subir(input: HTMLInputElement): Promise<void> {
    const producto = this.producto();
    const archivo = this.archivo();
    if (!producto || !archivo || this.subiendo()) return;

    this.subiendo.set(true);
    this.error.set('');
    this.mensaje.set('');
    try {
      const actualizado = await firstValueFrom(
        this.productsService.subirImagen(producto.id, archivo),
      );
      this.liberarPreview();
      this.archivo.set(null);
      input.value = '';
      this.producto.set(actualizado);
      this.mensaje.set('Imagen actualizada.');
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.subiendo.set(false);
    }
  }

  private liberarPreview(): void {
    const url = this.previewLocal();
    if (url) URL.revokeObjectURL(url);
  }
}

export default AltaEdicionProductoPage;
