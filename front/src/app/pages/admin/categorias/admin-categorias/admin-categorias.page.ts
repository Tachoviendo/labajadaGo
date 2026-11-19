import { Component, computed, inject, resource, signal } from '@angular/core';
import { FormField, form, maxLength, minLength, required, schema, submit } from '@angular/forms/signals';
import { NgbAlert } from '@ng-bootstrap/ng-bootstrap';
import { firstValueFrom } from 'rxjs';

import { ActualizarCategoriaBody, Categoria } from '../../../../models/product.model';
import { mensajeDeError } from '../../../../services/api-error';
import { CategoriesService } from '../../../../services/categories.service';

type ModeloCategoria = { nombre: string; descripcion: string };

const VACIO: ModeloCategoria = { nombre: '', descripcion: '' };

//mismas reglas que CategoryCreateBody en la api. schema() las deja reusables:
//las usan el form de alta y el de edicion
const reglasCategoria = schema<ModeloCategoria>((campo) => {
  required(campo.nombre, { message: 'El nombre es obligatorio.' });
  minLength(campo.nombre, 2, { message: 'Al menos 2 caracteres.' });
  maxLength(campo.nombre, 100, { message: 'Hasta 100 caracteres.' });
  maxLength(campo.descripcion, 255, { message: 'Hasta 255 caracteres.' });
});

//categorias del dueño: alta arriba y edicion en la misma fila de la tabla
@Component({
  selector: 'app-admin-categorias',
  imports: [FormField, NgbAlert],
  templateUrl: './admin-categorias.page.html',
  styleUrl: './admin-categorias.page.css',
})
export class AdminCategoriasPage {
  readonly #categoriesService = inject(CategoriesService);

  protected readonly categorias = resource({
    loader: () => firstValueFrom(this.#categoriesService.listar()),
  });

  //buscador: filtra la lista que ya esta cargada (son pocas, no hace falta ir a la api)
  protected readonly busqueda = signal('');
  protected readonly filtradas = computed(() => {
    if (!this.categorias.hasValue()) return [];
    const texto = this.busqueda().trim().toLowerCase();
    return this.categorias
      .value()
      .filter((c) => !texto || c.nombre.toLowerCase().includes(texto));
  });

  protected readonly mensajeExito = signal<string | null>(null);
  protected readonly mensajeError = signal<string | null>(null);

  //alta
  protected readonly nueva = signal<ModeloCategoria>({ ...VACIO });
  protected readonly nuevaForm = form(this.nueva, reglasCategoria);
  protected readonly creando = signal(false);

  //edicion: la fila que se esta editando y su propio form
  protected readonly editandoId = signal<number | null>(null);
  protected readonly edicion = signal<ModeloCategoria>({ ...VACIO });
  protected readonly edicionForm = form(this.edicion, reglasCategoria);
  protected readonly guardando = signal(false);

  protected crear(event: Event) {
    event.preventDefault();
    this.limpiarMensajes();
    submit(this.nuevaForm, async () => {
      this.creando.set(true);
      try {
        const { nombre, descripcion } = this.nueva();
        const creada = await firstValueFrom(
          this.#categoriesService.crear({ nombre, descripcion: descripcion.trim() || undefined }),
        );
        this.mensajeExito.set(`Se creó la categoría "${creada.nombre}".`);
        this.nueva.set({ ...VACIO });
        this.nuevaForm().reset();
        this.categorias.reload();
      } catch (error) {
        //409: ya existe una con ese nombre
        this.mensajeError.set(mensajeDeError(error));
      } finally {
        this.creando.set(false);
      }
    });
  }

  protected empezarEdicion(categoria: Categoria) {
    this.limpiarMensajes();
    this.edicion.set({ nombre: categoria.nombre, descripcion: categoria.descripcion ?? '' });
    this.edicionForm().reset();
    this.editandoId.set(categoria.id);
  }

  protected cancelarEdicion() {
    this.editandoId.set(null);
  }

  protected guardar(event: Event, categoria: Categoria) {
    event.preventDefault();
    this.limpiarMensajes();
    submit(this.edicionForm, async () => {
      //PATCH solo con lo que cambio
      const { nombre, descripcion } = this.edicion();
      const datos: ActualizarCategoriaBody = {};
      if (nombre.trim() !== categoria.nombre) datos.nombre = nombre.trim();
      if (descripcion.trim() !== (categoria.descripcion ?? '')) datos.descripcion = descripcion.trim();
      if (Object.keys(datos).length === 0) {
        this.editandoId.set(null);
        return;
      }

      this.guardando.set(true);
      try {
        await firstValueFrom(this.#categoriesService.actualizar(categoria.id, datos));
        this.mensajeExito.set('Cambios guardados.');
        this.editandoId.set(null);
        this.categorias.reload();
      } catch (error) {
        this.mensajeError.set(mensajeDeError(error));
      } finally {
        this.guardando.set(false);
      }
    });
  }

  protected buscar(event: Event) {
    this.busqueda.set((event.target as HTMLInputElement).value);
  }

  protected mensajeDeError(error: unknown) {
    return mensajeDeError(error);
  }

  private limpiarMensajes() {
    this.mensajeExito.set(null);
    this.mensajeError.set(null);
  }
}

export default AdminCategoriasPage;
