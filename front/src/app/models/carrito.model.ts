//mismo contrato que la api, ver docs/api/carrito.md

//api/schemas/cart.schema.js -> CartProductSchema
export type ProductoCarrito = {
  id: number;
  nombre: string;
  descripcion: string | null;
  precio: number;
  categoria: string | null;
  imagenUrl: string | null;
  stock: number;
  activo: boolean;
};

//api/schemas/cart.schema.js -> CartItemSchema. el id del item es el id del producto
export type ItemCarrito = {
  id: number;
  producto: ProductoCarrito;
  cantidad: number;
  subtotal: number;
};

//api/schemas/cart.schema.js -> CartSchema. el id del carrito es el id del usuario
export type Carrito = {
  id: number;
  usuarioId: number;
  items: ItemCarrito[];
  total: number;
  fechaActualizacion: string;
};
