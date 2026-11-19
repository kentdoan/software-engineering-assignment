import { IsEmail, IsIn, IsOptional, IsString } from 'class-validator';
import { UserRole } from '../../common/types';

export class LoginDto {
  @IsEmail({}, { message: 'Vui lòng nhập email hợp lệ.' })
  email: string;

  @IsString({ message: 'Vui lòng nhập mật khẩu.' })
  password: string;
}

export class CreateAuthDto {
  @IsString()
  name: string;

  @IsEmail({}, { message: 'Định dạng email không hợp lệ.' })
  email: string;

  @IsString()
  password: string;

  @IsString()
  phone: string;

  @IsOptional()
  @IsIn(['STUDENT', 'OPERATOR', 'ADMIN'])
  role?: UserRole;

  @IsOptional()
  @IsString()
  studentId?: string;

  @IsOptional()
  @IsString()
  university?: string;

  @IsOptional()
  @IsString()
  staffId?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  citizenId?: string;
}
