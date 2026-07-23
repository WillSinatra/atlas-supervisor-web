import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { OrdersModule } from './modules/orders/orders.module';
import { CrewsModule } from './modules/crews/crews.module';
import { CustomersModule } from './modules/customers/customers.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ReportsModule } from './modules/reports/reports.module';
import { SettingsModule } from './modules/settings/settings.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { FilesModule } from './modules/files/files.module';
import { SlasModule } from './modules/slas/slas.module';
import { HealthModule } from './modules/health/health.module';
import { WebsocketsModule } from './websockets/websockets.module';
import { DispatchModule } from './modules/dispatch/dispatch.module';

@Module({
  imports: [
    // Global config
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Rate limiting
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),

    // Cron jobs (apertura diaria de despacho)
    ScheduleModule.forRoot(),

    // Colas (timeouts de cascada de despacho)
    BullModule.forRootAsync({
      useFactory: () => ({
        connection: {
          host: process.env.REDIS_HOST || 'localhost',
          port: Number(process.env.REDIS_PORT || 6379),
        },
      }),
    }),

    // Core modules
    PrismaModule,
    AuthModule,
    UsersModule,
    OrdersModule,
    CrewsModule,
    CustomersModule,
    DashboardModule,
    ReportsModule,
    SettingsModule,
    NotificationsModule,
    FilesModule,
    SlasModule,
    HealthModule,
    WebsocketsModule,
    DispatchModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}