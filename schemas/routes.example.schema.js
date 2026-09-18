//este archivo no es un modulo de negocio: es un ejemplo de como combinar
//los schemas de src/schemas/*.js en el objeto schema de cada ruta fastify,
//cubriendo el checklist completo (params, querystring, headers, body,
//response por codigo) para un puñado de endpoints representativos de
//cada recurso. el resto de los endpoints del contrato sigue el mismo
//patron (ver docs/api-contract.md para la lista completa)
import { Type } from "@fastify/type-provider-typebox";
import { AuthHeaders, IdParam, paginated } from "./common.schema.js";
import { ErrorResponseSchema } from "./errors.schema.js";
import { ProductSchema, ProductFiltersQuery } from "./product.schema.js";
import { AddCartItemBody, CartSchema } from "./cart.schema.js";
import {
  CreateOrderBody,
  OrderSchema,
  OrderStatusChangeBody,
} from "./order.schema.js";

//GET /products, publico, paginado y filtrable
export const listProductsSchema = {
  querystring: ProductFiltersQuery,
  response: {
    200: paginated(ProductSchema),
    400: ErrorResponseSchema, //ej: precioMin > precioMax, page/limit fuera de rango
  },
};

//POST /cart/items, requiere sesion de cliente
export const addCartItemSchema = {
  headers: AuthHeaders,
  body: AddCartItemBody,
  response: {
    200: CartSchema, //devuelve el carrito completo actualizado
    400: ErrorResponseSchema, //cantidad <= 0, productoId no es entero, etc.
    401: ErrorResponseSchema, //falta token o token invalido/expirado
    404: ErrorResponseSchema, //productoId no existe
    409: ErrorResponseSchema, //stock insuficiente para la cantidad pedida
  },
};

//POST /orders, checkout. toma el carrito del usuario autenticado
export const createOrderSchema = {
  headers: AuthHeaders,
  body: CreateOrderBody,
  response: {
    201: OrderSchema,
    400: ErrorResponseSchema, //metodoPago fuera del enum, direccionId invalido
    401: ErrorResponseSchema, //no autenticado
    404: ErrorResponseSchema, //direccionId no existe o no pertenece al usuario
    409: ErrorResponseSchema, //carrito vacio, o stock insuficiente de algun item al confirmar
  },
};

//PATCH /orders/:id/status, avanzar/retroceder estado.
//requiere rol cajero o dueño
export const changeOrderStatusSchema = {
  headers: AuthHeaders,
  params: IdParam,
  body: OrderStatusChangeBody,
  response: {
    200: OrderSchema,
    400: ErrorResponseSchema, //estado no es un valor del enum
    401: ErrorResponseSchema, //no autenticado
    403: ErrorResponseSchema, //autenticado pero rol = cliente (sin permiso)
    404: ErrorResponseSchema, //el pedido :id no existe
    409: ErrorResponseSchema, //transicion de estado no permitida (ej: entregado -> realizado)
  },
};

//DELETE /cart/items/:id, ejemplo de respuesta 204 (sin body)
export const removeCartItemSchema = {
  headers: AuthHeaders,
  params: IdParam,
  response: {
    204: Type.Null(),
    401: ErrorResponseSchema,
    404: ErrorResponseSchema, //el item :id no existe o no pertenece al carrito del usuario
  },
};
