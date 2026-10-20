import { ForbiddenError, NotFoundError } from "../errors/response.errors.js";
import { hashPassword } from "./password.service.js";

const columnasPerfil = {
  nombre: "nombre",
  email: "email",
  telefono: "telefono",
  password: "password",
};

export async function getById(app, id, usuarioAutenticado) {
  if (usuarioAutenticado.rol !== "dueno" && id !== usuarioAutenticado.id) {
    throw new ForbiddenError("no podés consultar el perfil de otro usuario");
  }

  const { rows } = await app.pg.query(
    `SELECT id, nombre, email, telefono, rol, activo, fecha_creacion
     FROM usuario WHERE id = $1`,
    [id],
  );

  if (!rows[0]) throw new NotFoundError("usuario inexistente");
  return aPublico(rows[0]);
}

export async function updateProfile(app, id, usuarioAutenticado, cambios) {
  if (id !== usuarioAutenticado.id) {
    throw new ForbiddenError("solo podés modificar tu propio perfil");
  }

  const entradas = Object.entries(cambios).filter(([campo]) =>
    Object.hasOwn(columnasPerfil, campo),
  );
  const valores = await Promise.all(
    entradas.map(async ([campo, valor]) =>
      campo === "password" ? hashPassword(valor) : valor,
    ),
  );
  const asignaciones = entradas.map(
    ([campo], indice) => `${columnasPerfil[campo]} = $${indice + 1}`,
  );
  valores.push(id);

  const { rows } = await app.pg.query(
    `UPDATE usuario SET ${asignaciones.join(", ")}
     WHERE id = $${valores.length}
     RETURNING id, nombre, email, telefono, rol, activo, fecha_creacion`,
    valores,
  );

  if (!rows[0]) throw new NotFoundError("usuario inexistente");
  return aPublico(rows[0]);
}

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
