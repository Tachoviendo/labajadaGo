import { Type } from "@fastify/type-provider-typebox";
import { CategorySchema } from "./category.schema.js";
import { PaginationQuery } from "./common.schema.js";


//nota: db/schema.sql define producto.categoria como VARCHAR(100) suelto,
//pero docs/modelo-logico.md dice categoria_id (FK a la tabla categoria).
//este schema sigue el modelo logico (FK).
//hay que actualizar schema.sql: reemplazar la columna categoria por
//categoria_id INTEGER REFERENCES categoria(id)
export const ProductSchema = Type.Object({
  id: Type.Integer(),
  nombre: Type.String(),
  descripcion: Type.Union([Type.String(), Type.Null()]),
  precio: Type.Integer({
    minimum: 0,
    description: "Precio en la unidad monetaria menor (ej: centavos) o entero, a definir por el equipo",
  }),
  categoria: CategorySchema,
  imagenUrl: Type.Union([Type.String({ format: "uri" }), Type.Null()]),
  stock: Type.Integer({ minimum: 0 }),
  activo: Type.Boolean(),
});

export const ProductCreateBody = Type.Object({
  nombre: Type.String({ minLength: 2, maxLength: 150 }),
  descripcion: Type.Optional(Type.String({ maxLength: 500 })),
  precio: Type.Integer({ minimum: 0 }),
  categoriaId: Type.Integer({ minimum: 1 }),
  imagenUrl: Type.Optional(Type.String({ format: "uri", maxLength: 300 })),
  stock: Type.Optional(Type.Integer({ minimum: 0, default: 0 })),
});

export const ProductUpdateBody = Type.Partial(
  Type.Object({
    nombre: Type.String({ minLength: 2, maxLength: 150 }),
    descripcion: Type.String({ maxLength: 500 }),
    precio: Type.Integer({ minimum: 0 }),
    categoriaId: Type.Integer({ minimum: 1 }),
    imagenUrl: Type.String({ format: "uri", maxLength: 300 }),
    stock: Type.Integer({ minimum: 0 }),
    activo: Type.Boolean(),
  }),
  { minProperties: 1 },
);

//busqueda y filtro de catalogo, se combina con paginacion
export const ProductFiltersQuery = Type.Object({
  ...PaginationQuery.properties,
  nombre: Type.Optional(
    Type.String({ maxLength: 150, description: "Búsqueda parcial por nombre (ILIKE)" }),
  ),
  categoriaId: Type.Optional(Type.Integer({ minimum: 1 })),
  precioMin: Type.Optional(Type.Integer({ minimum: 0 })),
  precioMax: Type.Optional(Type.Integer({ minimum: 0 })),
  activo: Type.Optional(
    Type.Boolean({
      description: "Por defecto el catálogo público solo muestra activo=true; el dueño puede pedir activo=false",
    }),
  ),
  sort: Type.Optional(
    Type.Union(
      [
        Type.Literal("precio_asc"),
        Type.Literal("precio_desc"),
        Type.Literal("nombre_asc"),
        Type.Literal("nombre_desc"),
      ],
      { default: "nombre_asc" },
    ),
  ),
});
