import { Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateAuthDto, LoginDto } from './dto/create-auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('register')
  register(@Body() dto: CreateAuthDto) {
    return this.authService.registerUser(dto);
  }

  @Post('logout')
  logout(@Headers('authorization') authorization?: string) {
    return this.authService.revokeSession(authorization);
  }

  @Get('me')
  me(@Headers('authorization') authorization?: string) {
    return this.authService.me(authorization);
  }
}
