import { Type } from "@fastify/type-provider-typebox";
import { ProductSchema } from "./product.schema.js";


export const CartItemSchema = Type.Object({
  id: Type.Integer(),
  producto: ProductSchema,
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
