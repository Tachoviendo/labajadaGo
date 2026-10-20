import Fastify from "fastify";
import routes from "./routes/index.js";
import swaggerPlugin from "../plugins/swagger.js";
import dbPlugin from "../plugins/db.js";
import jwtPlugin from "../plugins/jwt.js";
import errorHandlerPlugin from "../plugins/errorHandler.js";
import corsPlugin from "../plugins/cors.js";


export function buildApp() {
  const app = Fastify({
    logger: { level: process.env.FASTIFY_LOG_LEVEL || "info" },
  });


  app.register(corsPlugin);
  app.register(dbPlugin); 
  app.register(dbPlugin);
  app.register(jwtPlugin);
  app.register(errorHandlerPlugin);
  app.register(swaggerPlugin);

  app.register(routes, {
    prefix: "/api",
  });

  return app;
}