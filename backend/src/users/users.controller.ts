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
import { AccountStatus, AuditCategory, UserRole } from '../common/interfaces';
import { ChangePasswordDto, LockAccountDto, RejectRegistrationDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  getMyProfile(
    @Headers('authorization') authorization?: string,
    @Query('userId') userId?: string,
  ) {
    return this.usersService.getUserProfile(authorization, userId);
  }

  @Patch('profile')
  updateProfile(
    @Headers('authorization') authorization: string | undefined,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.updateUserProfile(authorization, dto);
  }

  @Post('change-password')
  changePassword(
    @Headers('authorization') authorization: string | undefined,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.usersService.changeUserPassword(authorization, dto);
  }

  @Get('admin/registrations')
  getPendingRegistrations(@Query('status') status?: string) {
    return this.usersService.listRegistrations(status);
  }

  @Post('admin/registrations/:id/approve')
  approveRegistration(
    @Param('id') id: string,
    @Headers('authorization') authorization?: string,
  ) {
    return this.usersService.processApprovalDecision(id, true, undefined, authorization);
  }

  @Post('admin/registrations/:id/reject')
  rejectRegistration(
    @Param('id') id: string,
    @Body() dto: RejectRegistrationDto,
    @Headers('authorization') authorization?: string,
  ) {
    return this.usersService.processApprovalDecision(id, false, dto.reason, authorization);
  }

  @Get('admin/accounts')
  getUserList(
    @Query('q') q?: string,
    @Query('role') role?: UserRole | 'ALL',
    @Query('status') status?: AccountStatus | 'ALL',
  ) {
    return this.usersService.listAccounts({ q, role, status });
  }

  @Get('admin/accounts/:id/history')
  getUserDetailsAndHistory(@Param('id') id: string) {
    return this.usersService.getAccountHistory(id);
  }

  @Post('admin/accounts/:id/lock')
  lockAccount(
    @Param('id') id: string,
    @Body() dto: LockAccountDto,
    @Headers('authorization') authorization?: string,
  ) {
    return this.usersService.lockUserAccount(id, dto?.reason, authorization);
  }

  @Post('admin/accounts/:id/unlock')
  unlockAccount(
    @Param('id') id: string,
    @Headers('authorization') authorization?: string,
  ) {
    return this.usersService.unlockUserAccount(id, authorization);
  }

  @Delete('admin/accounts/:id')
  deleteAccount(
    @Param('id') id: string,
    @Headers('authorization') authorization?: string,
  ) {
    return this.usersService.deleteUserAccount(id, authorization);
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
