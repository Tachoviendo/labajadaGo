import { Type } from "@fastify/type-provider-typebox";
import { UserSchema } from "./user.schema.js";
import { ErrorResponseSchema } from "./errors.schema.js";

// registro de cliente.
//solo crea usuarios con rol "cliente", los roles internos se crean
//via POST /users (ver user.schema.js -> CreateInternalUserBody), no aca

//nota importante: en db/schema.sql la columna password es VARCHAR(20).
//Hay que cambiarlo a esto.
export const RegisterBody = Type.Object({
  nombre: Type.String({ minLength: 2, maxLength: 100 }),
  email: Type.String({ format: "email", maxLength: 150 }),
  password: Type.String({ minLength: 8, maxLength: 72 }),
  telefono: Type.Optional(Type.String({ maxLength: 30 })),
});

export const RegisterResponse = Type.Object({
  usuario: UserSchema,
  token: Type.String({ description: "JWT para usar en Authorization: Bearer <token>" }),
});

//POST /auth/register
export const registerSchema = {
  body: RegisterBody,
  response: {
    201: RegisterResponse,
    400: ErrorResponseSchema, //datos invalidos (ej: password corta, email mal formado)
    409: ErrorResponseSchema, //email ya registrado
  },
};

// login de cualquier rol (cliente, cajero, dueño)
export const LoginBody = Type.Object({
  email: Type.String({ format: "email" }),
  password: Type.String({ minLength: 1 }),
});

export const LoginResponse = Type.Object({
  usuario: UserSchema,
  token: Type.String(),
});

//POST /auth/login
export const loginSchema = {
  body: LoginBody,
  response: {
    200: LoginResponse,
    400: ErrorResponseSchema, //body mal formado (falta email o password)
    401: ErrorResponseSchema, //credenciales invalidas o usuario inactivo
  },
};

//POST /auth/logout, no recibe body, invalida el token del lado server (si aplica) o es no-op del lado cliente
export const logoutSchema = {
  response: {
    204: Type.Null(),
    401: ErrorResponseSchema,
  },
};
