import { BadRequestError, PayloadTooLargeError } from "../errors/response.errors.js";

//firma de los primeros bytes de cada formato aceptado: no alcanza con el
//content-type que manda el cliente, se chequea que el archivo lo sea de verdad
const FIRMAS_IMAGEN = {
  "image/jpeg": (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "image/png": (b) =>
    b.length > 8 &&
    b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  "image/webp": (b) =>
    b.length > 12 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP",
};

//lee la imagen de un request multipart (campo "file") y la valida: tipo jpeg/png/webp,
//tamaño maximo (el limite real lo pone @fastify/multipart al registrarse) y contenido.
//devuelve { buffer, mimetype, filename } listo para subir al bucket
export async function leerImagenSubida(request, { maxMb }) {
  if (!request.isMultipart()) {
    throw new BadRequestError("enviá la imagen como multipart/form-data en el campo 'file'");
  }

  const data = await request.file();
  if (!data) {
    throw new BadRequestError("no se envió ninguna imagen");
  }

  const firmaValida = FIRMAS_IMAGEN[data.mimetype];
  if (!firmaValida) {
    data.file.resume();
    throw new BadRequestError("solo se aceptan imágenes jpeg, png o webp");
  }

  let buffer;
  try {
    buffer = await data.toBuffer();
  } catch (error) {
    if (error.code === "FST_REQ_FILE_TOO_LARGE") {
      throw new PayloadTooLargeError(`la imagen supera los ${maxMb} MB`);
    }
    throw error;
  }

  if (!firmaValida(buffer)) {
    throw new BadRequestError("el archivo no es una imagen válida del tipo indicado");
  }

  return { buffer, mimetype: data.mimetype, filename: data.filename };
}
