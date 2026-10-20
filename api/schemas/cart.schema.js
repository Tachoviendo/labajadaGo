import { Type } from "@fastify/type-provider-typebox";
// Producto tal como se persiste hoy en db/schema.sql: categoria es texto nullable.
export const CartProductSchema = Type.Object({
  id: Type.Integer(),
  nombre: Type.String(),
  descripcion: Type.Union([Type.String(), Type.Null()]),
  precio: Type.Integer({ minimum: 0 }),
  categoria: Type.Union([Type.String(), Type.Null()]),
  imagenUrl: Type.Union([Type.String({ format: "uri" }), Type.Null()]),
  stock: Type.Integer({ minimum: 0 }),
  activo: Type.Boolean(),
});


export const CartItemSchema = Type.Object({
  id: Type.Integer(),
  producto: CartProductSchema,
  cantidad: Type.Integer({ minimum: 1 }),
  subtotal: Type.Integer({ minimum: 0, description: "producto.precio * cantidad" }),
});

export const CartSchema = Type.Object({
  id: Type.Integer(),
  usuarioId: Type.Integer(),
  items: Type.Array(CartItemSchema),
  total: Type.Integer({ minimum: 0 }),
  fechaActualizacion: Type.String({ format: "date-time" }),
});

//agregar un producto al carrito.
//si el producto ya esta en el carrito, la operacion debe sumar cantidad
//al item existente
export const AddCartItemBody = Type.Object({
  productoId: Type.Integer({ minimum: 1 }),
  cantidad: Type.Integer({ minimum: 1, maximum: 999 }),
});

//modificar cantidad de un item existente cantidad 0 no se permite
export const UpdateCartItemBody = Type.Object({
  cantidad: Type.Integer({ minimum: 1, maximum: 999 }),
});
