import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SettingsModule } from '../settings/settings.module';
import { WebsocketsModule } from '../../websockets/websockets.module';
import { DispatchConfigService } from './dispatch-config.service';
import { DispatchService, DISPATCH_CASCADE_QUEUE } from './dispatch.service';
import { DispatchCascadeProcessor } from './dispatch-cascade.processor';
import { DispatchOpeningCron } from './dispatch-opening.cron';

@Module({
  imports: [
    SettingsModule,
    WebsocketsModule,
    BullModule.registerQueue({ name: DISPATCH_CASCADE_QUEUE }),
  ],
  providers: [DispatchConfigService, DispatchService, DispatchCascadeProcessor, DispatchOpeningCron],
  exports: [DispatchService],
})
export class DispatchModule {}
