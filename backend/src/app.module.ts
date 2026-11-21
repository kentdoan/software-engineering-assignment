import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { BookingsModule } from './bookings/bookings.module';
import { ChargingModule } from './charging/charging.module';
import { DispatchModule } from './dispatch/dispatch.module';
import { HubsModule } from './hubs/hubs.module';
import { IncidentsModule } from './incidents/incidents.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { PrismaModule } from './prisma/prisma.module';
import { RentalsModule } from './rentals/rentals.module';
import { ResetModule } from './reset/reset.module';
import { SimulationModule } from './simulation/simulation.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    AuthModule,
    UsersModule,
    HubsModule,
    BookingsModule,
    RentalsModule,
    ChargingModule,
    DispatchModule,
    IncidentsModule,
    MonitoringModule,
    SimulationModule,
    ResetModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
