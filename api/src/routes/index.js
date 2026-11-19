import userRoutes from "./users.routes.js";
import categoryRoutes from "./categoria.routes.js";
import productRoutes from "./products.routes.js";
import cartRoutes from "./cart.routes.js";
import orderRoutes from "./orders.routes.js";
import paymentRoutes from "./payments.routes.js";
import addressRoutes from "./addresses.routes.js";
import authRoutes from "./auth.routes.js";
import repartosRoutes from "./repartos.routes.js";
import seguimientoRoutes from "./seguimiento.routes.js";

export default async function routes(app) {
  //GET /api/health: lo usan el healthcheck de docker y el deploy. prueba tambien la base
  app.get("/health", { schema: { hide: true } }, async () => {
    await app.pg.query("SELECT 1");
    return { status: "ok" };
  });

  await app.register(userRoutes);
  await app.register(categoryRoutes);
  await app.register(productRoutes);
  await app.register(cartRoutes);
  await app.register(orderRoutes);
  await app.register(paymentRoutes);
  await app.register(addressRoutes);
  await app.register(authRoutes);
  await app.register(repartosRoutes);
  await app.register(seguimientoRoutes);
}
