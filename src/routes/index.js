import userRoutes from "./users.routes.js";
import categoryRoutes from "./categories.routes.js";

export default async function routes(app) {
  await app.register(userRoutes);
  await app.register(categoryRoutes);
}
