import { BadGatewayError, InternalError } from "../errors/response.errors.js";

//sube una imagen al servicio bucket (ver bucket/server.js) y devuelve la url publica.
//la url completa es lo que se guarda en producto.imagen_url
export async function subirImagen(buffer, mimetype, nombreOriginal) {
  const bucketUrl = process.env.BUCKET_URL || "http://localhost:3001";
  const publicUrl = process.env.BUCKET_PUBLIC_URL || bucketUrl;
  const token = process.env.BUCKET_TOKEN;
  if (!token) {
    throw new InternalError("el bucket de imágenes no está configurado (BUCKET_TOKEN)");
  }

  const form = new FormData();
  form.append("file", new Blob([buffer], { type: mimetype }), nombreOriginal || "imagen");

  let respuesta;
  try {
    respuesta = await fetch(`${bucketUrl}/`, {
      method: "POST",
      headers: { "x-bucket-token": token },
      body: form,
    });
  } catch {
    throw new BadGatewayError("no se pudo conectar con el bucket de imágenes");
  }

  if (!respuesta.ok) {
    throw new BadGatewayError(`el bucket de imágenes respondió ${respuesta.status}`);
  }

  const { filename } = await respuesta.json();
  return `${publicUrl.replace(/\/$/, "")}/${encodeURIComponent(filename)}`;
}
