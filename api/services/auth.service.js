import {
  UnAuthenticatedError,
  ConflictError,
  BadRequestError,
  NotFoundError,
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

export async function changePassword(app, usuarioId, { passwordActual, passwordNueva }) {
  const { rows } = await app.pg.query(
    "SELECT password FROM usuario WHERE id = $1",
    [usuarioId],
  );
  if (!rows[0]) {
    throw new NotFoundError("no existe un usuario con ese id");
  }
  if (!(await verifyPassword(passwordActual, rows[0].password))) {
    throw new BadRequestError("la contraseña actual es incorrecta");
  }

  const passwordHash = await hashPassword(passwordNueva);
  const { rows: actualizados } = await app.pg.query(
    "UPDATE usuario SET password = $1 WHERE id = $2 RETURNING id",
    [passwordHash, usuarioId],
  );
  if (!actualizados[0]) {
    throw new NotFoundError("no existe un usuario con ese id");
  }
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
