import cors from "cors";
import express from "express";
import { errorHandler, notFoundHandler } from "./lib/http.js";
import { checkoutRouter } from "./routes/checkout.js";
import { authRouter } from "./routes/auth.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { merchantApiRouter } from "./routes/merchantApi.js";
import type { Deps } from "./services/merchant.js";

export function createApp(deps: Deps) {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  app.use(
    cors({
      origin: deps.config.corsOrigins,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "x-wallet-address"],
    }),
  );
  app.use(express.json({ limit: "100kb" }));

  app.get("/healthz", async (_req, res) => {
    try {
      await deps.prisma.$queryRaw`SELECT 1`;
      res.json({ status: "ok" });
    } catch {
      res.status(503).json({ status: "unavailable" });
    }
  });

  // Runtime config for the frontend, so one frontend build works in any environment.
  app.get("/api/v1/config", (_req, res) => {
    res.json({
      cluster: deps.config.SOLANA_CLUSTER,
      rpcUrl: deps.config.publicRpcUrl,
      appUrl: deps.config.PUBLIC_APP_URL,
      registrationEnabled: deps.config.REGISTRATION_ENABLED,
      platformFeeLamports: deps.config.PLATFORM_FEE_ADDRESS ? deps.config.PLATFORM_FEE_LAMPORTS : 0,
    });
  });

  app.use("/api/v1/invoice", checkoutRouter(deps));
  app.use("/api/v1/auth", authRouter(deps));
  app.use("/api/v1/dashboard", dashboardRouter(deps));
  app.use("/api/v1/userApi", merchantApiRouter(deps));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
