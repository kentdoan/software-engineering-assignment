import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { DispatchService } from './dispatch.service';
import { CreateDispatchDto } from './dto/create-dispatch.dto';

@Controller('dispatch')
export class DispatchController {
  constructor(private readonly dispatchService: DispatchService) {}

  @Get()
  listOrders() {
    return this.dispatchService.listOrders();
  }

  @Post()
  createDispatchOrder(
    @Headers('authorization') authorization: string | undefined,
    @Body() dto: CreateDispatchDto,
  ) {
    return this.dispatchService.executeDispatchOrder(authorization, dto);
  }

  @Post(':id/complete')
  completeOrder(
    @Param('id') id: string,
    @Headers('authorization') authorization?: string,
  ) {
    return this.dispatchService.completeOrder(id, authorization);
  }

  @Post(':id/cancel')
  cancelOrder(
    @Param('id') id: string,
    @Headers('authorization') authorization?: string,
  ) {
    return this.dispatchService.cancelOrder(id, authorization);
  }
}
