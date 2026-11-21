import { Controller, Headers, Post } from '@nestjs/common';
import { ResetService } from './reset.service';

@Controller('reset-data')
export class ResetController {
  constructor(private readonly resetService: ResetService) {}

  @Post()
  resetData(
    @Headers('authorization') authorization?: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.resetService.resetDatabase(authorization);
  }
}
