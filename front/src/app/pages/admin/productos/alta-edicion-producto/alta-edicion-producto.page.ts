import {
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  linkedSignal,
  numberAttribute,
  resource,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  FormField,
  form,
  max,
  maxLength,
  min,
  minLength,
  required,
  submit,
  validate,
} from '@angular/forms/signals';
import { NgbAlert } from '@ng-bootstrap/ng-bootstrap';
import { firstValueFrom } from 'rxjs';

import { CamaraComponent } from '../../../../components/camara/camara.component';
import { ActualizarProductoBody, CrearProductoBody, Producto } from '../../../../models/product.model';
import { urlPublica } from '../../../../pipes/url-publica.pipe';
import { mensajeDeError } from '../../../../services/api-error';
import { CategoriesService } from '../../../../services/categories.service';
import { ProductsService } from '../../../../services/products.service';

//mismos limites que POST /productos/:id/imagen en la api
const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 2 * 1024 * 1024;
const PLACEHOLDER = '/imagenes/imagendeproductos.png';

type ModeloProducto = {
  nombre: string;
  descripcion: string;
  precio: number;
  //el <select> trabaja con texto; se pasa a numero al guardar
  categoriaId: string;
  stock: number;
  activo: boolean;
};

const MODELO_VACIO: ModeloProducto = {
  nombre: '',
  descripcion: '',
  precio: 0,
  categoriaId: '',
  stock: 0,
  activo: true,
};

function aModelo(producto: Producto): ModeloProducto {
  return {
    nombre: producto.nombre,
    descripcion: producto.descripcion ?? '',
    precio: producto.precio,
    categoriaId: String(producto.categoria.id),
    stock: producto.stock,
    activo: producto.activo,
  };
}

//la api pide enteros (pesos sin centavos, unidades de stock)
function esEntero({ value }: { value: () => number }) {
  return Number.isInteger(value()) ? null : { kind: 'entero', message: 'Tiene que ser un número entero.' };
}

//alta (/admin/productos/nuevo) y edicion (/admin/productos/:id_producto) en la misma pagina.
//la imagen se sube aparte (POST /productos/:id/imagen), despues de guardar los datos
@Component({
  selector: 'app-alta-edicion-producto',
  imports: [FormField, RouterLink, NgbAlert, CamaraComponent],
  templateUrl: './alta-edicion-producto.page.html',
  styleUrl: './alta-edicion-producto.page.css',
})
export class AltaEdicionProductoPage {
  readonly #productsService = inject(ProductsService);
  readonly #categoriesService = inject(CategoriesService);
  readonly #router = inject(Router);

  //sin :id_producto (ruta 'nuevo') queda undefined = alta
  readonly idProducto = input(undefined, {
    alias: 'id_producto',
    transform: (valor: string | undefined) => (valor === undefined ? undefined : numberAttribute(valor)),
  });
  protected readonly esNuevo = computed(() => this.idProducto() === undefined);

  //params undefined -> el resource no carga nada (en el alta no hay producto que pedir)
  protected readonly producto = resource({
    params: () => {
      const id = this.idProducto();
      return id === undefined ? undefined : { id };
    },
    loader: ({ params }) => firstValueFrom(this.#productsService.obtener(params.id)),
  });

  protected readonly categorias = resource({
    loader: () => firstValueFrom(this.#categoriesService.listar()),
  });

  //el modelo del form arranca vacio (alta) o con el producto cargado (edicion).
  //linkedSignal: se resetea solo cuando llega el producto y despues se edita libremente
  protected readonly modelo = linkedSignal<ModeloProducto>(() =>
    this.producto.hasValue() ? aModelo(this.producto.value()) : MODELO_VACIO,
  );

  //mismas reglas que ProductCreateBody / ProductUpdateBody en la api
  protected readonly productoForm = form(this.modelo, (campo) => {
    required(campo.nombre, { message: 'El nombre es obligatorio.' });
    minLength(campo.nombre, 2, { message: 'El nombre debe tener al menos 2 caracteres.' });
    maxLength(campo.nombre, 150, { message: 'El nombre puede tener hasta 150 caracteres.' });

    maxLength(campo.descripcion, 500, { message: 'La descripción puede tener hasta 500 caracteres.' });

    required(campo.precio, { message: 'El precio es obligatorio.' });
    min(campo.precio, 0, { message: 'El precio no puede ser negativo.' });
    max(campo.precio, 1_000_000, { message: 'El precio parece demasiado alto.' });
    validate(campo.precio, esEntero);

    required(campo.categoriaId, { message: 'Elegí una categoría.' });

    required(campo.stock, { message: 'El stock es obligatorio.' });
    min(campo.stock, 0, { message: 'El stock no puede ser negativo.' });
    validate(campo.stock, esEntero);
  });

  //imagen nueva: elegida de un archivo o sacada con la camara
  protected readonly imagen = signal<File | null>(null);
  protected readonly usandoCamara = signal(false);
  protected readonly errorImagen = signal<string | null>(null);
  readonly #vistaPrevia = computed(() => {
    const imagen = this.imagen();
    return imagen ? URL.createObjectURL(imagen) : null;
  });
  protected readonly imagenUrl = computed(
    () =>
      this.#vistaPrevia() ??
      (this.producto.hasValue() ? urlPublica(this.producto.value().imagenUrl) : null) ??
      PLACEHOLDER,
  );

  protected readonly guardando = signal(false);
  protected readonly errorApi = signal<string | null>(null);

  constructor() {
    inject(DestroyRef).onDestroy(() => this.liberarVistaPrevia());
  }

  protected elegirArchivo(event: Event) {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0] ?? null;
    input.value = '';
    if (!archivo) return;
    if (!TIPOS_PERMITIDOS.includes(archivo.type)) {
      this.errorImagen.set('Solo se aceptan imágenes JPG, PNG o WEBP.');
      return;
    }
    if (archivo.size > MAX_BYTES) {
      this.errorImagen.set('La imagen no puede pesar más de 2 MB.');
      return;
    }
    this.cambiarImagen(archivo);
  }

  protected fotoDeCamara(foto: Blob) {
    this.usandoCamara.set(false);
    this.cambiarImagen(new File([foto], 'producto.jpg', { type: 'image/jpeg' }));
  }

  protected quitarImagenNueva() {
    this.cambiarImagen(null);
  }

  protected enviar(event: Event) {
    event.preventDefault();
    this.errorApi.set(null);
    //submit marca todos los campos como tocados y solo sigue si el form es valido
    submit(this.productoForm, async () => {
      this.guardando.set(true);
      try {
        const guardado = await this.guardarDatos();
        const imagen = this.imagen();
        if (imagen) {
          await firstValueFrom(this.#productsService.subirImagen(guardado.id, imagen));
        }
        await this.#router.navigate(['/admin/productos']);
      } catch (error) {
        this.errorApi.set(mensajeDeError(error));
      } finally {
        this.guardando.set(false);
      }
    });
  }

  protected mensajeDeError(error: unknown) {
    return mensajeDeError(error);
  }

  //alta: POST con todo. edicion: PATCH (la api acepta cualquier subconjunto de campos)
  private async guardarDatos(): Promise<Producto> {
    const m = this.modelo();
    const descripcion = m.descripcion.trim();
    const id = this.idProducto();

    if (id === undefined) {
      const datos: CrearProductoBody = {
        nombre: m.nombre.trim(),
        precio: m.precio,
        categoriaId: Number(m.categoriaId),
        stock: m.stock,
      };
      if (descripcion) datos.descripcion = descripcion;
      return firstValueFrom(this.#productsService.crear(datos));
    }

    const datos: ActualizarProductoBody = {
      nombre: m.nombre.trim(),
      descripcion: descripcion || null,
      precio: m.precio,
      categoriaId: Number(m.categoriaId),
      stock: m.stock,
      activo: m.activo,
    };
    return firstValueFrom(this.#productsService.actualizar(id, datos));
  }

  private cambiarImagen(imagen: File | null) {
    this.liberarVistaPrevia();
    this.imagen.set(imagen);
    this.errorImagen.set(null);
  }

  private liberarVistaPrevia() {
    const url = this.#vistaPrevia();
    if (url) URL.revokeObjectURL(url);
  }
}

export default AltaEdicionProductoPage;
