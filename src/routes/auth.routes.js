import {
  RegisterBody,
  LoginBody,
  LoginResponse,
  registerSchema,
  loginSchema,
  logoutSchema,
  RegisterResponse,
} from "../schemas/index.js";

export default async function authRoutes(app) {
  // Registrar usuario
  app.post(
    "/auth/register",
    {
      schema: {
        body: RegisterBody,
        response: {
          201: RegisterResponse,
        },
      },
    },
    async () => {
      return {
        message: "Registrar usuario",
      };
    },
  );

  // Iniciar sesión
  app.post(
    "/auth/login",
    {
      schema: loginSchema,
    },
    async () => {
      return {
        message: "Iniciar sesión",
      };
    },
  );

  // Cerrar sesión
  app.post(
    "/auth/logout",
    {
      schema: logoutSchema,
    },
    async () => {
      return {
        message: "Cerrar sesión",
      };
    },
  );
}
