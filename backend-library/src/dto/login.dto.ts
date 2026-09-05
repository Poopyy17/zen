import { IsEmail, IsString, MinLength } from 'class-validator';

/**
 * Shared request DTO for platform operator login (`POST /platform-auth/login`
 * in core-service) — see PROJECT_OUTLINE.md, "Platform Operators (Super Admin)".
 */
export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  password!: string;
}
