import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { AccountStatus, AuditCategory, UserRole } from '../common/types';
import { ChangePasswordDto, LockAccountDto, RejectRegistrationDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  getProfile(
    @Headers('authorization') authorization?: string,
    @Query('userId') userId?: string,
  ) {
    return this.usersService.getProfile(authorization, userId);
  }

  @Patch('profile')
  updateProfile(
    @Headers('authorization') authorization: string | undefined,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.updateProfile(authorization, dto);
  }

  @Post('change-password')
  changePassword(
    @Headers('authorization') authorization: string | undefined,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(authorization, dto);
  }

  @Get('admin/registrations')
  listRegistrations(@Query('status') status?: string) {
    return this.usersService.listRegistrations(status);
  }

  @Post('admin/registrations/:id/approve')
  approveRegistration(
    @Param('id') id: string,
    @Headers('authorization') authorization?: string,
  ) {
    return this.usersService.approveRegistration(id, authorization);
  }

  @Post('admin/registrations/:id/reject')
  rejectRegistration(
    @Param('id') id: string,
    @Body() dto: RejectRegistrationDto,
    @Headers('authorization') authorization?: string,
  ) {
    return this.usersService.rejectRegistration(id, dto.reason, authorization);
  }

  @Get('admin/accounts')
  listAccounts(
    @Query('q') q?: string,
    @Query('role') role?: UserRole | 'ALL',
    @Query('status') status?: AccountStatus | 'ALL',
  ) {
    return this.usersService.listAccounts({ q, role, status });
  }

  @Get('admin/accounts/:id/history')
  getAccountHistory(@Param('id') id: string) {
    return this.usersService.getAccountHistory(id);
  }

  @Post('admin/accounts/:id/lock')
  lockAccount(
    @Param('id') id: string,
    @Body() dto: LockAccountDto,
    @Headers('authorization') authorization?: string,
  ) {
    return this.usersService.lockAccount(id, dto?.reason, authorization);
  }

  @Post('admin/accounts/:id/unlock')
  unlockAccount(
    @Param('id') id: string,
    @Headers('authorization') authorization?: string,
  ) {
    return this.usersService.unlockAccount(id, authorization);
  }

  @Delete('admin/accounts/:id')
  deleteAccount(
    @Param('id') id: string,
    @Headers('authorization') authorization?: string,
  ) {
    return this.usersService.deleteAccount(id, authorization);
  }

  @Get('admin/audit-logs')
  listAuditLogs(
    @Query('category') category?: AuditCategory | 'ALL',
    @Query('q') q?: string,
    @Query('format') format?: string,
  ) {
    return this.usersService.listAuditLogs({ category, q, format });
  }
}
