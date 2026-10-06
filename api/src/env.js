import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

//el .env vive en la raiz del repo (lo comparten la api y docker-compose).
//se importa primero en server.js para que las variables esten cargadas antes que todo
dotenv.config({ path: fileURLToPath(new URL("../../.env", import.meta.url)) });
