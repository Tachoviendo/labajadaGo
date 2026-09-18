import { Type } from "@fastify/type-provider-typebox";
import { RolEnum } from "./enums.schema.js";

//representacion publica de un usuario (nunca incluye password/password_hash)
export const UserSchema = Type.Object({
  id: Type.Integer(),
  nombre: Type.String(),
  email: Type.String({ format: "email" }),
  telefono: Type.Union([Type.String(), Type.Null()]),
  rol: RolEnum,
  activo: Type.Boolean(),
  fechaCreacion: Type.String({ format: "date-time" }),
});

//body para que un usuario edite su propio perfil
//no permite cambiar rol ni activo, eso es exclusivo de administracion.
//requiere al menos un campo (si no, no tiene sentido el PATCH -> 400)
export const UserUpdateBody = Type.Object(
  {
    nombre: Type.Optional(Type.String({ minLength: 2, maxLength: 100 })),
    email: Type.Optional(Type.String({ format: "email", maxLength: 150 })),
    telefono: Type.Optional(Type.String({ maxLength: 30 })),
    password: Type.Optional(
      Type.String({
        minLength: 8,
        maxLength: 72, //limite practico de bcrypt, ver nota sobre columna password
        description: "Nueva contraseña en texto plano; el server la hashea",
      }),
    ),
  },
  { minProperties: 1, additionalProperties: false },
);

//body para que el dueño active/desactive o cambie el rol de un usuario interno.
//separado de UserUpdateBody porque son permisos distintos (solo dueño)
export const UserAdminUpdateBody = Type.Object(
  {
    activo: Type.Optional(Type.Boolean()),
    rol: Type.Optional(Type.Union([Type.Literal("cajero"), Type.Literal("dueno")])),
  },
  { minProperties: 1, additionalProperties: false },
);

//body para que el dueño cree una cuenta interna (cajero o dueño)
export const CreateInternalUserBody = Type.Object({
  nombre: Type.String({ minLength: 2, maxLength: 100 }),
  email: Type.String({ format: "email", maxLength: 150 }),
  password: Type.String({ minLength: 8, maxLength: 72 }),
  telefono: Type.Optional(Type.String({ maxLength: 30 })),
  rol: Type.Union([Type.Literal("cajero"), Type.Literal("dueno")], {
    description: "Un cliente nunca se crea por esta vía, se crea con /auth/register",
  }),
});

//query params para que el dueño liste usuarios internos, filtrando por rol/activo
export const UserFiltersQuery = Type.Object({
  rol: Type.Optional(RolEnum),
  activo: Type.Optional(Type.Boolean()),
});
