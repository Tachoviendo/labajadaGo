import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { Producto } from '../../../../models/product.model';
import { ProductsService } from '../../../../services/products.service';
import { mensajeDeError } from '../../../../services/api-error';

const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 2 * 1024 * 1024;
const PLACEHOLDER = '/imagenes/imagendeproductos.png';

//por ahora la pagina solo maneja la imagen del producto (:id).
//el formulario de alta y edicion de datos queda pendiente
@Component({
  selector: 'app-alta-edicion-producto',
  imports: [RouterLink],
  templateUrl: './alta-edicion-producto.page.html',
  styleUrl: './alta-edicion-producto.page.css',
})
export class AltaEdicionProductoPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly productsService = inject(ProductsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly producto = signal<Producto | null>(null);
  readonly esNuevo = signal(false);
  readonly cargando = signal(true);
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
    () => this.previewLocal() ?? this.producto()?.imagenUrl ?? PLACEHOLDER,
  );

  constructor() {
    this.destroyRef.onDestroy(() => this.liberarPreview());
  }

  async ngOnInit(): Promise<void> {
    const parametro = this.route.snapshot.paramMap.get('id');
    if (!parametro) {
      this.esNuevo.set(true);
      this.cargando.set(false);
      return;
    }

    const id = Number(parametro);
    if (!Number.isInteger(id) || id <= 0) {
      this.error.set('El identificador del producto no es válido.');
      this.cargando.set(false);
      return;
    }

    try {
      this.producto.set(await firstValueFrom(this.productsService.obtener(id)));
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.cargando.set(false);
    }
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
