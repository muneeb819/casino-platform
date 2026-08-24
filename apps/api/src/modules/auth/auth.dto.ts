import { IsEmail, IsIn, IsInt, IsOptional, IsString, Max, MinLength, Min } from "class-validator";

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString() @MinLength(8)
  password: string;

  @IsIn(["USD", "EUR", "PHP", "THB"]) @IsOptional()
  currency?: string;

  @IsIn(["en", "zh", "th", "fil"]) @IsOptional()
  locale?: string;

  @IsString() @IsOptional()
  affiliateRef?: string;
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString() @MinLength(8)
  password: string;
}

export class RefreshDto {
  @IsString()
  refreshToken: string;
}

export class LimitsDto {
  @IsInt() @Min(0)
  dailyLimitCents: number;

  @IsInt() @Min(0)
  weeklyLimitCents: number;

  @IsInt() @Min(0)
  monthlyLimitCents: number;
}

export class SelfExcludeDto {
  @IsInt() @Min(1) @Max(36)
  months: number;
}

export class KycSubmitDto {
  @IsIn(["ID_CARD", "PASSPORT", "UTILITY_BILL"])
  docType: string;

  @IsString() @MinLength(3)
  fileRef: string;
}
