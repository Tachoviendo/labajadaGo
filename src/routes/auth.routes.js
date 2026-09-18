export default async function authRoutes(app) {
  // Registrar usuario
  app.post("/auth/register", async () => {
    return {
      message: "Registrar usuario",
    };
  });

  // Iniciar sesión
  app.post("/auth/login", async () => {
    return {
      message: "Iniciar sesión",
    };
  });

  // Cerrar sesión
  app.post("/auth/logout", async () => {
    return {
      message: "Cerrar sesión",
    };
  });

  // Solicitar recuperación de contraseña
  app.post("/auth/forgot-password", async () => {
    return {
      message: "Solicitar recuperación de contraseña",
    };
  });

  // Restablecer contraseña
  app.post("/auth/reset-password", async () => {
    return {
      message: "Restablecer contraseña",
    };
  });
}
