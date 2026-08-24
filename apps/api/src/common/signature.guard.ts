import { CanActivate, ExecutionContext, UnauthorizedException } from "@nestjs/common";
import crypto from "crypto";
import type { Request } from "express";
import { AppConfig } from "./config";

export class SignatureGuard implements CanActivate {
  private secret = AppConfig.load().providerSecret;

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request & { rawBody?: Buffer }>();
    const provided = (req.headers["x-signature"] as string | undefined)?.toLowerCase();
    if (!req.rawBody || !provided) throw new UnauthorizedException("Missing signature");
    const expected = crypto.createHmac("sha256", this.secret).update(req.rawBody).digest("hex");
    const a = Buffer.from(expected);
    const b = Buffer.from(provided);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      throw new UnauthorizedException("Bad signature");
    }
    return true;
  }
}
