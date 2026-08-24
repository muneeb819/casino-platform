import "dotenv/config";
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import type { NestExpressApplication } from "@nestjs/platform-express";
import type { Request } from "express";
import { AppModule } from "./app.module";
import { AppConfig } from "./common/config";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const cfg = AppConfig.load();

  app.use(
    require("express").json({
      limit: "1mb",
      verify: (req: Request & { rawBody?: Buffer }, _res: unknown, buf: Buffer) => {
        req.rawBody = buf;
      },
    }),
  );
  app.enableCors({ origin: cfg.webOrigin.split(","), credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  await app.listen(cfg.port);
  console.log(`API listening on http://localhost:${cfg.port}`);
}

bootstrap();
