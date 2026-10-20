//mismo contrato que la api, ver docs/api/contrato-auth.md
//si cambia algun schema de la api hay que cambiarlo aca tambien

//api/schemas/enums.schema.js -> RolEnum (dueno sin ñ)
export type Rol = 'cliente' | 'cajero' | 'dueno';

//api/schemas/user.schema.js -> UserSchema, nunca trae la password
export type Usuario = {
  id: number;
  nombre: string;
  email: string;
  telefono: string | null;
  rol: Rol;
  activo: boolean;
  fechaCreacion: string;
};

//api/schemas/auth.schema.js -> LoginBody
export type LoginBody = {
  email: string;
  password: string;
};

//api/schemas/auth.schema.js -> RegisterBody
export type RegisterBody = {
  nombre: string;
  email: string;
  password: string;
  telefono?: string;
};

//api/schemas/auth.schema.js -> LoginResponse y RegisterResponse (misma forma)
export type AuthResponse = {
  usuario: Usuario;
  token: string;
};

//api/schemas/errors.schema.js -> ErrorResponseSchema
export type ApiError = {
  statusCode: number;
  code: string;
  message: string;
};