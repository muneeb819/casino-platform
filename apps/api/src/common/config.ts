import path from "path";

export class AppConfig {
  static load() {
    return {
      port: Number(process.env.PORT || 4000),
      jwtSecret: process.env.JWT_SECRET || "dev-jwt-secret-change-me",
      providerSecret: process.env.PROVIDER_SECRET || "dev-provider-hmac-secret",
      webOrigin: process.env.WEB_ORIGIN || "http://localhost:3000",
      demoBonusCents: Number(process.env.DEMO_BONUS_CENTS || 5000),
      publicBaseUrl: process.env.PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 4000}`,
      dbFile: path.resolve(__dirname, "..", "prisma", "dev.db"),
    };
  }
}
