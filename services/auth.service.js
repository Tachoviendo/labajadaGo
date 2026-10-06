import {
  UnAuthenticatedError,
  ConflictError,
} from "../errors/response.errors.js";

//proyecto experimental: password en texto plano, sin hashear

export async function login(app, email, password) {
  const { rows } = await app.pg.query(
    "SELECT * FROM usuario WHERE email = $1",
    [email],
  );
  const usuario = rows[0];

  if (!usuario || !usuario.activo) {
    throw new UnAuthenticatedError("credenciales inválidas");
  }

  if (password !== usuario.password) {
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

  const { rows } = await app.pg.query(
    `INSERT INTO usuario (nombre, email, password, telefono, rol)
     VALUES ($1, $2, $3, $4, 'cliente')
     RETURNING *`,
    [nombre, email, password, telefono || null],
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
function aPublico(usuario) {
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