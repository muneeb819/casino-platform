import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from "@nestjs/common";
import { IsIn, IsInt, IsOptional, IsString } from "class-validator";
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser, type AuthedUser } from "../../common/auth.guards";
import { AdminService } from "./admin.service";

class StatusDto {
  @IsIn(["ACTIVE", "SUSPENDED"])
  status: "ACTIVE" | "SUSPENDED";
}

class AdjustDto {
  @IsIn(["REAL", "BONUS"])
  kind: "REAL" | "BONUS";

  @IsInt()
  amountCents: number;

  @IsString() @IsOptional()
  reason?: string;
}

class KycDecisionDto {
  @IsIn(["APPROVED", "REJECTED"])
  decision: "APPROVED" | "REJECTED";

  @IsString() @IsOptional()
  note?: string;
}

class KycSubmitDto {
  @IsIn(["ID_CARD", "PASSPORT", "UTILITY_BILL"])
  docType: string;

  @IsString()
  fileRef: string;
}

@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
export class AdminController {
  constructor(private admin: AdminService) {}

  @Get("overview")
  overview() {
    return this.admin.overview();
  }

  @Get("players")
  players(@Query("q") q?: string) {
    return this.admin.players(q);
  }

  @HttpCode(200)
  @Post("players/:id/status")
  setStatus(@Param("id") id: string, @Body() dto: StatusDto) {
    return this.admin.setStatus(id, dto.status);
  }

  @HttpCode(200)
  @Post("players/:id/adjust")
  adjust(@Param("id") id: string, @Body() dto: AdjustDto) {
    return this.admin.adjust(id, dto.kind, dto.amountCents, dto.reason ?? "admin adjustment");
  }

  @Get("kyc")
  kycQueue() {
    return this.admin.kycQueue();
  }

  @HttpCode(200)
  @Post("kyc/submit")
  submitKyc(@CurrentUser() user: AuthedUser, @Body() dto: KycSubmitDto) {
    return this.admin.submitKyc(user.id, dto.docType, dto.fileRef);
  }

  @HttpCode(200)
  @Post("kyc/:docId/review")
  reviewKyc(@Param("docId") docId: string, @Body() dto: KycDecisionDto) {
    return this.admin.reviewKyc(docId, dto.decision, dto.note);
  }

  @Get("ggr")
  ggr(@Query("from") from?: string, @Query("to") to?: string) {
    return this.admin.ggr(from, to);
  }
}
