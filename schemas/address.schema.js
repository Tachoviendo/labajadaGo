import { Type } from "@fastify/type-provider-typebox";

// un cliente puede tener varias direcciones

//hay que actualizar schema.sql para agregar
// id y esPredeterminada
export const AddressSchema = Type.Object({
  id: Type.Integer(),
  usuarioId: Type.Integer(),
  calle: Type.String(),
  numero: Type.Union([Type.String(), Type.Null()]),
  ciudad: Type.String(),
  referencia: Type.Union([Type.String(), Type.Null()]),
  esPredeterminada: Type.Boolean(),
});

export const AddressCreateBody = Type.Object({
  calle: Type.String({ minLength: 2, maxLength: 150 }),
  numero: Type.Optional(Type.String({ maxLength: 20 })),
  ciudad: Type.String({ minLength: 2, maxLength: 100 }),
  referencia: Type.Optional(Type.String({ maxLength: 200 })),
  esPredeterminada: Type.Optional(Type.Boolean({ default: false })),
});

export const AddressUpdateBody = Type.Partial(AddressCreateBody, {
  minProperties: 1,
});
