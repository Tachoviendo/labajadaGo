import userRoutes from "./users.routes.js";

export default async function routes(fastify) {
  await fastify.register(userRoutes);
}
