import { Module } from '@nestjs/common';
import { FilesModule } from '../files/files.module';
import { DispatchModule } from '../dispatch/dispatch.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [FilesModule, DispatchModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}