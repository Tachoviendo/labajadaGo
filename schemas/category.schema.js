import { Type } from "@fastify/type-provider-typebox";

// gestion de categorias por el dueño
export const CategorySchema = Type.Object({
  id: Type.Integer(),
  nombre: Type.String(),
  descripcion: Type.Union([Type.String(), Type.Null()]),
});

export const CategoryCreateBody = Type.Object({
  nombre: Type.String({ minLength: 2, maxLength: 100 }),
  descripcion: Type.Optional(Type.String({ maxLength: 255 })),
});

export const CategoryUpdateBody = Type.Partial(CategoryCreateBody, {
  minProperties: 1,
});
