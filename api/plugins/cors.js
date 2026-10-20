import fp from "fastify-plugin";
import cors from "@fastify/cors";

//permite que el front (angular, en otro puerto) llame a la api desde el navegador.
//CORS_ORIGIN puede tener varios origenes separados por coma
export default fp(async (fastify) => {
  const origenes = (process.env.CORS_ORIGIN || "http://localhost:4200").split(",");

  await fastify.register(cors, {
    origin: origenes,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });
});