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
