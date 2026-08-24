import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  createParamDecorator,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "./prisma.service";
import { AppConfig } from "./config";

export interface AuthedUser {
  id: string;
  email: string;
  role: string;
  status: string;
}

export const ROLES_KEY = "roles";
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthedUser => {
  return ctx.switchToHttp().getRequest().user;
});

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private jwt = new JwtService({ secret: AppConfig.load().jwtSecret });

  constructor(private prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const auth: string | undefined = req.headers["authorization"];
    if (!auth?.startsWith("Bearer ")) throw new UnauthorizedException("Missing token");
    let payload: { sub: string };
    try {
      payload = await this.jwt.verifyAsync(auth.slice(7));
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.status === "SUSPENDED") throw new UnauthorizedException("Account unavailable");
    req.user = { id: user.id, email: user.email, role: user.role, status: user.status } satisfies AuthedUser;
    return true;
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required?.length) return true;
    const { user } = ctx.switchToHttp().getRequest();
    if (!user || !required.includes(user.role)) throw new ForbiddenException("Insufficient role");
    return true;
  }
}
