export type Categoria = {
  id: number;
  nombre: string;
  descripcion: string | null;
};

export type Producto = {
  id: number;
  nombre: string;
  descripcion: string | null;
  precio: number;
  categoria: Categoria;
  imagenUrl: string | null;
  stock: number;
  activo: boolean;
};

export type CrearProductoBody = {
  nombre: string;
  descripcion?: string;
  precio: number;
  categoriaId: number;
  imagenUrl?: string;
  stock?: number;
};

//api/schemas/product.schema.js -> ProductUpdateBody (todo opcional, al menos un campo)
export type ActualizarProductoBody = {
  nombre?: string;
  descripcion?: string | null;
  precio?: number;
  categoriaId?: number;
  stock?: number;
  activo?: boolean;
};

//api/schemas/category.schema.js -> CategoryCreateBody / CategoryUpdateBody
export type CrearCategoriaBody = {
  nombre: string;
  descripcion?: string;
};
export type ActualizarCategoriaBody = Partial<CrearCategoriaBody>;

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type ProductosPaginados = {
  data: Producto[];
  pagination: Pagination;
};

export type FiltrosProductos = {
  nombre?: string;
  categoriaId?: number;
  precioMin?: number;
  precioMax?: number;
  activo?: boolean;
  sort?: string;
  page?: number;
  limit?: number;
};
