//mismo contrato que la api, ver docs/api/usuarios.md
import { Rol, Usuario } from './auth.model';

//api/schemas/user.schema.js -> CreateInternalUserBody
export type CrearUsuarioInternoBody = {
  nombre: string;
  email: string;
  password: string;
  telefono?: string;
  rol: 'cajero' | 'dueno';
};

//api/schemas/user.schema.js -> UserFiltersQuery
export type FiltrosUsuarios = {
  rol?: Rol;
  activo?: boolean;
  page?: number;
  limit?: number;
};

//api/schemas/user.schema.js -> UserListResponse
export type ListaUsuarios = {
  data: Usuario[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

//api/schemas/user.schema.js -> UserUpdateBody (solo datos propios, sin rol ni activo)
export type ActualizarPerfilBody = {
  nombre?: string;
  email?: string;
  telefono?: string;
};

//api/schemas/user.schema.js -> UserAdminUpdateBody (solo dueño)
export type ActualizarAdminBody = {
  activo?: boolean;
  rol?: 'cajero' | 'dueno';
};

//api/schemas/auth.schema.js -> PasswordChangeBody
export type CambiarPasswordBody = {
  passwordActual: string;
  passwordNueva: string;
};