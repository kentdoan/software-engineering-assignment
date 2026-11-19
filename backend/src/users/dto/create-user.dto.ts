import { IsEmail, IsOptional, IsString } from 'class-validator';

export class CreateUserDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  phone: string;

  @IsOptional()
  @IsString()
  university?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  citizenId?: string;
}

export class ChangePasswordDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsString()
  currentPassword: string;

  @IsString()
  newPassword: string;
}

export class RejectRegistrationDto {
  @IsString()
  reason: string;
}

export class LockAccountDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
