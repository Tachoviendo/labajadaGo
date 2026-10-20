import {
  UnAuthenticatedError,
  ConflictError,
} from "../errors/response.errors.js";
import { hashPassword, verifyPassword } from "./password.service.js";

export async function login(app, email, password) {
  const { rows } = await app.pg.query(
    `SELECT id, nombre, email, password, telefono, rol, activo, fecha_creacion
     FROM usuario WHERE email = $1`,
    [email],
  );
  const usuario = rows[0];

  if (!usuario || !usuario.activo) {
    throw new UnAuthenticatedError("credenciales inválidas");
  }

  if (!(await verifyPassword(password, usuario.password))) {
    throw new UnAuthenticatedError("credenciales inválidas");
  }

  const token = firmarToken(app, usuario);

  return { usuario: aPublico(usuario), token };
}

export async function register(app, { nombre, email, password, telefono }) {
  const { rows: existentes } = await app.pg.query(
    "SELECT id FROM usuario WHERE email = $1",
    [email],
  );
  if (existentes.length > 0) {
    throw new ConflictError("ya existe una cuenta con ese email");
  }

  const passwordHash = await hashPassword(password);
  const { rows } = await app.pg.query(
    `INSERT INTO usuario (nombre, email, password, telefono, rol)
     VALUES ($1, $2, $3, $4, 'cliente')
     RETURNING *`,
    [nombre, email, passwordHash, telefono || null],
  );
  const usuario = rows[0];

  const token = firmarToken(app, usuario);

  return { usuario: aPublico(usuario), token };
}

function firmarToken(app, usuario) {
  return app.jwt.sign(
    { id: usuario.id, rol: usuario.rol },
    { expiresIn: process.env.JWT_EXPIRES_IN || "8h" },
  );
}

//quita el password y adapta los nombres de columna al shape publico (UserSchema)
export function aPublico(usuario) {
  return {
    id: usuario.id,
    nombre: usuario.nombre,
    email: usuario.email,
    telefono: usuario.telefono,
    rol: usuario.rol,
    activo: usuario.activo,
    fechaCreacion: usuario.fecha_creacion.toISOString(),
  };
}