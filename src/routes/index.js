import userRoutes from "./users.routes.js";
import categoryRoutes from "./categories.routes.js";
import productRoutes from "./products.routes.js";
import cartRoutes from "./cart.routes.js";
import orderRoutes from "./orders.routes.js";

export default async function routes(app) {
  await app.register(userRoutes);
  await app.register(categoryRoutes);
  await app.register(productRoutes);
  await app.register(cartRoutes);
  await app.register(orderRoutes);
}
